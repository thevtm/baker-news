package commands

type ErrCommandValidationFailed struct {
	msg string
}

func NewErrCommandValidationFailed(msg string) ErrCommandValidationFailed {
	return ErrCommandValidationFailed{
		msg: msg,
	}
}

func (e ErrCommandValidationFailed) Error() string {
	return e.msg
}
