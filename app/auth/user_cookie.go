package auth

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/negrel/assert"
	"github.com/thevtm/baker-news/state"
)

const AuthCookieUserIDName = "baker-news_user-id"
const AuthCookieRoleName = "baker-news_user-role"

const CookieExpirationDuration = 30 * 24 * time.Hour

var GuestCookie = NewAuthCookie(state.UserGuest.ID, state.UserRoleGuest)

type AuthCookie struct {
	UserID   int64
	UserRole state.UserRole
}

func NewAuthCookie(user_id int64, user_role state.UserRole) AuthCookie {
	return AuthCookie{
		UserID:   user_id,
		UserRole: user_role,
	}
}

func (c AuthCookie) IsGuest() bool {
	return c.UserRole == state.UserRoleGuest
}

func (c AuthCookie) IsUser() bool {
	return c.UserRole == state.UserRoleUser
}

func ParseAuthCookie(r *http.Request) (AuthCookie, bool, error) {
	user_cookie := AuthCookie{}

	// 1. Check if User cookie is present
	user_id_cookie := r.CookiesNamed(AuthCookieUserIDName)
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
	user_role_cookie := r.CookiesNamed(AuthCookieRoleName)
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

func SetAuthCookie(w http.ResponseWriter, user_cookie *AuthCookie) {
	http.SetCookie(w, &http.Cookie{
		Name:     AuthCookieUserIDName,
		Value:    strconv.FormatInt(user_cookie.UserID, 10),
		Expires:  time.Now().Add(CookieExpirationDuration),
		Secure:   false,
		HttpOnly: true,
		Path:     "/",
	})

	http.SetCookie(w, &http.Cookie{
		Name:     AuthCookieRoleName,
		Value:    string(user_cookie.UserRole),
		Expires:  time.Now().Add(CookieExpirationDuration),
		Secure:   false,
		HttpOnly: true,
		Path:     "/",
	})
}
