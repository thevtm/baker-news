package commands

type ErrCommandValidationFailed struct {
	msg string
}

func NewErrCommandValidationFailed(msg string) error {
	return &ErrCommandValidationFailed{
		msg: msg,
	}
}

func (e *ErrCommandValidationFailed) Error() string {
	return e.msg
}
