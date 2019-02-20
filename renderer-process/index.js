const {ipcRenderer} = require('electron')
const tooltip = require('electron-tooltip')

const selectPattern = document.querySelector('.dropdown-menu')
const selectDirBtn = document.getElementById('select-directory')
const uploadFile = document.getElementById('upload-file')
const runPattern = document.getElementById('run-algorithm')

tooltip({
    //
})

// ------------------------ Listeners ------------------------------------

selectPattern.addEventListener('click', (event) => {
  if(event.target.dataset.value){
    document.getElementById('pattern-type').innerHTML = `${event.target.dataset.value} Patterns`
    closeResultContent()
    closeProgress()
    closeSpecifications()
  }
})

selectDirBtn.addEventListener('click', (event) => {
  ipcRenderer.send('open-file-dialog')
})

uploadFile.addEventListener('click', (event) => {
  showProgress()
  showSpecifications()
  closeResultContent()
})

runPattern.addEventListener('click', (event) => {
  showResultContent()
})

ipcRenderer.on('selected-directory', (event, path) => {
  document.getElementById('select-directory').value = `${path}`
  closeResultContent()
  closeProgress()
  closeSpecifications()
})


// --------------------- Functions ----------------------------------


function showResultContent(){
  mainView = document.querySelector('.grid-content-right.is-shown')
  resultView = document.querySelector('.grid-content-left')
  if (mainView){
    mainView.classList.remove('is-shown')
    mainView.classList.add('adjust')
    resultView.classList.add('is-shown')
  }
}

function showProgress(){
  progressView = document.querySelector('.graank-progress.is-shown')
  if (!progressView){
    progressView = document.querySelector('.graank-progress')
    progressView.classList.add('is-shown')
  }
}

function showSpecifications(){

  specsGradual = document.querySelector('.grid-specs-gradual-group.is-shown')
  specsTemporal = document.querySelector('.grid-specs-temporal-group.is-shown')

  csvFile = ""
  timeExists = checkColumn(csvFile)
  if (timeExists){
    if(!specsTemporal){
      specsTemporal = document.querySelector('.grid-specs-temporal-group')
      specsTemporal.classList.add('is-shown')
    }
    if(specsGradual){
      specsGradual.classList.remove('is-shown')
    }
  }else{
    if(!specsGradual){
      specsGradual = document.querySelector('.grid-specs-gradual-group')
      specsGradual.classList.add('is-shown')
    }
    if(specsGradual){
      specsTemporal.classList.remove('is-shown')
    }
  }
}

function closeResultContent(){
  resultView = document.querySelector('.grid-content-left.is-shown')
  if (resultView){
    resultView.classList.remove('is-shown')
    mainView = document.querySelector('.grid-content-right.adjust')
    if(mainView){
      mainView.classList.remove('adjust')
      mainView.classList.add('is-shown')
      }
    }
  }

function closeProgress(){
    progressView = document.querySelector('.graank-progress.is-shown')
    if (progressView){
      progressView.classList.remove('is-shown')
    }
  }

function closeSpecifications(){

    specsGradual = document.querySelector('.grid-specs-gradual-group.is-shown')
    specsTemporal = document.querySelector('.grid-specs-temporal-group.is-shown')

    if(specsGradual){
      specsTemporal.classList.remove('is-shown')
    }
    if(specsTemporal){
      specsTemporal.classList.remove('is-shown')
    }

  }

function  checkColumn(csvFile){
    return true
  }
