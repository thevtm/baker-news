// $ go test -v --benchmem --bench . ./scratch/go-components-benchmark_test.go
// goos: linux
// goarch: amd64
// cpu: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
// BenchmarkStaticSmall
// BenchmarkStaticSmall-12              	 3588330	       323.9 ns/op	     104 B/op	       7 allocs/op
// BenchmarkStaticSmallToRaw
// BenchmarkStaticSmallToRaw-12         	36431824	        39.23 ns/op	      24 B/op	       1 allocs/op
// BenchmarkDynamicSmall
// BenchmarkDynamicSmall-12             	 3742520	       321.5 ns/op	      96 B/op	       7 allocs/op
// BenchmarkDynamicSmallToRaw
// BenchmarkDynamicSmallToRaw-12        	 6603398	       204.6 ns/op	      72 B/op	       4 allocs/op
// BenchmarkStaticLarge
// BenchmarkStaticLarge-12              	    2380	    635167 ns/op	  206971 B/op	   10810 allocs/op
// BenchmarkStaticLargeCache
// BenchmarkStaticLargeCache-12         	    3696	    320086 ns/op	   39575 B/op	    5030 allocs/op
// BenchmarkStaticLargeToRaw
// BenchmarkStaticLargeToRaw-12         	  530688	      2081 ns/op	   18432 B/op	       1 allocs/op
// BenchmarkStaticLargeToRawCache
// BenchmarkStaticLargeToRawCache-12    	  573744	      2024 ns/op	   18432 B/op	       1 allocs/op
// PASS
// ok  	command-line-arguments	11.965s

package main

import (
	"bytes"
	"fmt"
	"testing"

	gc "maragu.dev/gomponents"
	h "maragu.dev/gomponents/html"
)

func StaticSmall() gc.Node {
	return h.H1(gc.Text("Hello, World!"))
}

func BenchmarkStaticSmall(b *testing.B) {
	buf := new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		StaticSmall().Render(buf)
		buf.Reset()
	}
}

func BenchmarkStaticSmallToRaw(b *testing.B) {
	node := StaticSmall()

	buf := new(bytes.Buffer)
	node.Render(buf)
	raw_str := buf.String()

	component := func() gc.Node {
		return gc.Raw(raw_str)
	}

	buf = new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		component().Render(buf)
		buf.Reset()
	}
}

func DynamicSmall(s string) gc.Node {
	return h.H1(gc.Text(s))
}

func BenchmarkDynamicSmall(b *testing.B) {
	buf := new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		DynamicSmall("foobar").Render(buf)
		buf.Reset()
	}
}

func BenchmarkDynamicSmallToRaw(b *testing.B) {
	node := DynamicSmall("%s")

	buf := new(bytes.Buffer)
	node.Render(buf)
	raw_str := buf.String()

	component := func(s string) gc.Node {
		return gc.Raw(fmt.Sprintf(raw_str, s))
	}

	buf = new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		component("foobar").Render(buf)
		buf.Reset()
	}
}

func StaticLarge() gc.Node {
	lis := make(gc.Group, 1000)

	for i := 0; i < 1000; i++ {
		lis[i] = h.Li(gc.Textf("Item %d", i))
	}

	return h.HTML(
		h.Head(
			h.Meta(gc.Attr("charset", "UTF-8")),
			h.Title("Hello, World!"),
		),
		h.Body(
			h.H1(gc.Text("Hello, World!")),
			h.P(gc.Text("This is a paragraph")),
			h.A(gc.Text("Click me"), gc.Attr("href", "/")),
			h.Ul(lis),
		),
	)
}

func BenchmarkStaticLarge(b *testing.B) {
	buf := new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		StaticLarge().Render(buf)
		buf.Reset()
	}
}

func BenchmarkStaticLargeCache(b *testing.B) {
	buf := new(bytes.Buffer)
	node := StaticLarge()

	for i := 0; i < b.N; i++ {
		node.Render(buf)
		buf.Reset()
	}
}

func BenchmarkStaticLargeToRaw(b *testing.B) {
	node := StaticLarge()

	buf := new(bytes.Buffer)
	node.Render(buf)
	raw_str := buf.String()

	component := func() gc.Node {
		return gc.Raw(raw_str)
	}

	buf = new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		component().Render(buf)
		buf.Reset()
	}
}

func BenchmarkStaticLargeToRawCache(b *testing.B) {
	node := StaticLarge()

	buf := new(bytes.Buffer)
	node.Render(buf)
	raw_str := buf.String()

	component := func() gc.Node {
		return gc.Raw(raw_str)
	}

	node_raw := component()

	buf = new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		node_raw.Render(buf)
		buf.Reset()
	}
}
