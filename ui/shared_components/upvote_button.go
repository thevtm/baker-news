package shared_components

import (
	"io"
	"text/template"
)

var upvote_button_template *template.Template

const upvote_button_template_string = `
<a class="button" href="{{ index . 1}}" data-bk-state="not-upvoted">Upvote</a>
<a class="button" href="./posts_list/upvote/2" data-bk-state="upvoting" disabled>Upvoting...</a>
<a class="button" href="./posts_list/undo_upvote/2" data-bk-state="upvoted">Upvoted</a>
`

func init() {
	upvote_button_template = template.New("index")
	_, err := upvote_button_template.Parse(upvote_button_template_string)
	if err != nil {
		panic(err)
	}
}

func IndexPage(writer io.Writer) {
	upvote_button_template.ExecuteTemplate(writer, "index", nil)
}
