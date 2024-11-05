# Hey, Vim

**hey.vim** is a Vim plugin that utilizes the LLM service API to edit text.

It supports the following services:

- [OpenAI API][]
- [Google Gemini API][]
- [Anthropic Claude API][]

[OpenAI API]: https://openai.com/index/openai-api/
[Google Gemini API]: https://ai.google.dev/gemini-api
[Anthropic Claude API]: https://www.anthropic.com/api

https://user-images.githubusercontent.com/5019902/236111592-23fa3a36-d65d-4af7-9b86-6fe0f3c08bb9.mp4


## Installation

This plugin depends on [Deno][] and [denops.vim][].

[Deno]: https://deno.com/
[denops.vim]: https://github.com/vim-denops/denops.vim

```vim
Plug 'vim-denops/denops.vim'
Plug 'tani/hey.vim'
```

You need to get an API key for the LLM service and set it to the environment
variable:

- `$OPENAI_API_KEY` for [OpenAI API][].
- `$GOOGLE_API_KEY` for [Google Gemini API][].
- `$ANTHROPIC_API_KEY` for [Anthropic Claude API][].

Note that if you're using [denops-shared-server][], the environment variable is
separate from Vim. In this case, you should set it to the system environment
variable or set `g:hey_api_key`.

[denops-shared-server]: https://github.com/vim-denops/denops-shared-server.vim


## Usage

Use these commands:

- `:[range]Hey[!] {prompt}` - Edit text. With !, the text is replaced inplace.
- `:HeyAbort` - Abort the current asynchronous operation.
- `:HeyClose` - Close the Hey popup or window.

See `:help hey-commands` for more information.


## Options

See `:help hey-options` for more information.


## License

This software is released under the MIT License. https://git.io/mit-license
