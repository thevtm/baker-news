package signin

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/negrel/assert"
	app_ctx "github.com/thevtm/baker-news/app/context"
	"github.com/thevtm/baker-news/state"
)

const ContextKeyUserID app_ctx.ContextKey = "user_id"
const ContextKeyUserRole app_ctx.ContextKey = "user_role"

const AuthUserIDCookieName = "baker-news_user-id"
const AuthUserRoleCookieName = "baker-news_user-role"

const CookieExpirationDuration = 30 * 24 * time.Hour

var GuestCookie = NewUserCookie(state.GuestID, state.UserRoleGuest)

type UserCookie struct {
	UserID   int64
	UserRole state.UserRole
}

func NewUserCookie(user_id int64, user_role state.UserRole) UserCookie {
	return UserCookie{
		UserID:   user_id,
		UserRole: user_role,
	}
}

func (c UserCookie) IsGuest() bool {
	return c.UserRole == state.UserRoleGuest
}

func (c UserCookie) IsUser() bool {
	return c.UserRole == state.UserRoleUser
}

func ParseUserCookie(r *http.Request) (UserCookie, bool, error) {
	user_cookie := UserCookie{}

	// 1. Check if User cookie is present
	user_id_cookie := r.CookiesNamed(AuthUserIDCookieName)
	user_id_cookie_present := len(user_id_cookie) > 0
	assert.LessOrEqual(user_id_cookie, 1, "User id cookie must be present at most once")

	if !user_id_cookie_present {
		return user_cookie, false, nil
	}

	// 2. Parse user id cookie
	user_id_cookie_value := user_id_cookie[0].Value
	user_id, err := strconv.ParseInt(user_id_cookie_value, 10, 64)

	if err != nil {
		return user_cookie, false, fmt.Errorf("failed to parse user id cookie: %w", err)
	}

	// 3. Parse user role cookie
	user_role_cookie := r.CookiesNamed(AuthUserRoleCookieName)
	user_role_cookie_present := len(user_role_cookie) > 0
	assert.LessOrEqual(user_role_cookie, 1, "User role cookie must be present at most once")

	if !user_role_cookie_present {
		return user_cookie, false, nil
	}

	user_role := state.UserRole(user_role_cookie[0].Value)

	// 4. Success
	user_cookie.UserID = user_id
	user_cookie.UserRole = user_role
	return user_cookie, true, nil
}

func SetUserCookie(w http.ResponseWriter, user_cookie *UserCookie) {
	http.SetCookie(w, &http.Cookie{
		Name:     AuthUserIDCookieName,
		Value:    strconv.FormatInt(user_cookie.UserID, 10),
		Expires:  time.Now().Add(CookieExpirationDuration),
		Secure:   false,
		HttpOnly: true,
		Path:     "/",
	})

	http.SetCookie(w, &http.Cookie{
		Name:     AuthUserRoleCookieName,
		Value:    string(user_cookie.UserRole),
		Expires:  time.Now().Add(CookieExpirationDuration),
		Secure:   false,
		HttpOnly: true,
		Path:     "/",
	})
}

func SetGuestUserCookie(w http.ResponseWriter) UserCookie {
	SetUserCookie(w, &GuestCookie)
	return GuestCookie
}

func ParseUserCookieOrSetAsGuest(r *http.Request, w http.ResponseWriter) UserCookie {
	user_cookie, ok, err := ParseUserCookie(r)

	if err != nil {
		err = fmt.Errorf("failed to parse user cookie: %w", err)
		slog.ErrorContext(r.Context(), "ParseUserCookieOrSetAsGuest failed", slog.Any("error", err))
		return SetGuestUserCookie(w)
	}

	if !ok {
		return GuestCookie
	}

	return user_cookie
}
