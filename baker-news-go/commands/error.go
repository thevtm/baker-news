package commands

type CommandValidationError struct {
	msg string
}

func NewCommandValidationError(msg string) error {
	return &CommandValidationError{
		msg: msg,
	}
}

func (e *CommandValidationError) Error() string {
	return e.msg
}
