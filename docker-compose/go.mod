// The `data` folder is used to store the database files
// and it causes an issue with `go mod tidy` because it
// needs to owned by root and stuff.
// `go mod tidy` ignores directories that contain a `go.mod`.
