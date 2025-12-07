package state

var UserSystem = User{
	ID:       0,
	Username: "System",
	Role:     UserRoleSystem,
}

var UserAdmin = User{
	ID:       1,
	Username: "Admin",
	Role:     UserRoleAdmin,
}

var UserGuest = User{
	ID:       2,
	Username: "Guest",
	Role:     UserRoleGuest,
}

func (u *User) IsGuest() bool {
	return u.Role == UserRoleGuest
}

func (u *User) IsUser() bool {
	return u.Role == UserRoleUser
}
