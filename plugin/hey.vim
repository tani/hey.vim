if exists('g:loaded_hey')
  finish
endif
let g:loaded_hey = 1

function! Hey(prompt) range abort
  let s:seq_curs = get(s:, "s:seq_curs", [])
  call add(s:seq_curs, undotree()["seq_cur"])
  let s:firstline = a:firstline
  let s:lastline = a:lastline
  let s:prompt = a:prompt
  call denops#notify("hey", "hey", [s:firstline, s:lastline, s:prompt])
endfunction

function! HeyUndo() abort
  execute 'undo' s:seq_curs[-1]
  call remove(s:seq_curs, -1)
endfunction

function! HeyAgain() abort
  call add(s:seq_curs, undotree()["seq_cur"])
  execute 'undo' s:seq_curs[-2]
  call denops#notify("hey", "hey", [s:firstline, s:lastline, s:prompt])
endfunction

command! -nargs=1 -range Hey <line1>,<line2>call Hey(<q-args>)

command! HeyUndo call HeyUndo()
map <Plug>HeyUndo <Cmd>HeyUndo<CR>

command! HeyAgain call HeyAgain()
map <Plug>HeyAgain <Cmd>HeyAgain<CR>
