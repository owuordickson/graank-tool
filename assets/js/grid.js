
function showMainContent(){
  document.querySelector('.grid-content-right').classList.add('is-shown')
  resultView = document.querySelector('.grid-content-left.is-shown')
  if (resultView) resultView.classList.remove('is-shown')
}

showMainContent()
