const {ipcRenderer} = require('electron')
const tooltip = require('electron-tooltip')
const mime = require('mime')
let spawn = require('child_process').spawn

const selectPattern = document.querySelector('.dropdown-menu')
const selectDirBtn = document.getElementById('select-directory')
const uploadFile = document.getElementById('upload-file')
const runPattern = document.getElementById('run-algorithm')
const runPattern1 = document.getElementById('run-algorithm1')

const msgLabel = document.getElementById('show-message')

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
  csvFile = selectDirBtn.value
  msgLabel.innerHTML = ''
  showProgress()
  closeResultContent()
  showSpecifications(csvFile)
})

runPattern.addEventListener('click', (event) => {
  type = 2
  file = selectDirBtn.value
  ref_col = document.getElementById('input-ref').value
  min_sup = document.getElementById('input-sup').value
  min_rep = document.getElementById('input-rep').value

  showProgress()
  runPythonCode(type, file, (ref_col-1), min_sup, min_rep)
})

runPattern1.addEventListener('click', (event) => {
  type = 1
  file = selectDirBtn.value
  min_sup = document.getElementById('input-sup1').value

  showProgress()
  //runPythonCode(type, file, min_sup)
})

ipcRenderer.on('selected-directory', (event, path) => {
  selectDirBtn.value = `${path}`
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

    msgLabel.innerHTML = ''
    responseView = document.querySelector('.graank-response.is-shown')
    if(responseView){
      responseView.classList.remove('is-shown')
    }
  }
}

function showSpecifications(file){

  specsGradual = document.querySelector('.grid-specs-gradual-group.is-shown')
  specsTemporal = document.querySelector('.grid-specs-temporal-group.is-shown')

  isCSV = checkFile(file)
  if (isCSV){
    //validateTimeColumn(file)
    validateTimeColumn(file, (result) => {
      //msgLabel.innerHTML = `${result}`
      //if (result == 'timeOK'){
      if (result){
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
    })

  }
  closeProgress()
}

function showGradualSpecifications(){
  if(!specsGradual){
    specsGradual = document.querySelector('.grid-specs-gradual-group')
    specsGradual.classList.add('is-shown')
  }
  if(specsGradual){
    specsTemporal.classList.remove('is-shown')
  }
}

function showTemporalSpecifications(){
  if(!specsTemporal){
    specsTemporal = document.querySelector('.grid-specs-temporal-group')
    specsTemporal.classList.add('is-shown')
  }
  if(specsGradual){
    specsGradual.classList.remove('is-shown')
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

      responseView = document.querySelector('.graank-response')
      if(responseView){
        responseView.classList.add('is-shown')
      }
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

function  checkFile(file){
    ext = mime.getType(file)
    if (ext === 'text/csv' || ext === 'application/csv'){
      msgLabel.innerHTML = '<p style="color: green;">csv file verified &#128077</p><h5>click "Get Patterns"</h5>'
      closeProgress()
      return true
    }else{
      msgLabel.innerHTML = '<p>file is NOT csv! &#128577</p>'
      closeProgress()
      return false
    }
  }

  function validateTimeColumn(csvFile, callback){
    //progressBar.value = 30
    //return true
    type = 21
    let fileProcess = spawn('python',["./assets/python/border_tgraank.py", type, csvFile])
    result = ''
    fileProcess.stdout.on('data', (data) => {
        // Do something with the data returned from python script
        //msgLabel.innerHTML = `${data}`
        result += data.toString()
    })
    fileProcess.on('close', (code) => {
      return callback(result)
    })
  }

function runPythonCode(type, file, ref_col, min_sup, min_rep){
  let pythonProcess = spawn('python',["./assets/python/border_tgraank.py", type, file, ref_col, min_sup, min_rep])

  pythonProcess.stdout.on('data', (data) => {
      // Do something with the data returned from python script

      document.getElementById('text-result').innerHTML = `${data}`
      showResultContent()
      closeProgress()
  })
}
