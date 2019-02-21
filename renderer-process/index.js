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
const progressBar = document.getElementById('show-progress')

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
  showProgress()
  closeResultContent()
  showSpecifications(csvFile)
})

runPattern.addEventListener('click', (event) => {
  type = 1
  file = selectDirBtn.value
  ref_col = document.getElementById('input-ref').value
  min_sup = document.getElementById('input-sup').value
  min_rep = document.getElementById('input-rep').value
  runPythonCode(type, file, (ref_col-1), min_sup, min_rep)
})

runPattern1.addEventListener('click', (event) => {
  //showResultContent()
  type = 1
  file = selectDirBtn.value
  min_sup = document.getElementById('input-sup1').value
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
  }
}

function showSpecifications(file){

  specsGradual = document.querySelector('.grid-specs-gradual-group.is-shown')
  specsTemporal = document.querySelector('.grid-specs-temporal-group.is-shown')

  isCSV = checkFile(file)
  if (isCSV){
    timeExists = validateTimeColumn(file)
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

function  checkFile(file){
    ext = mime.getType(file)
    if (ext === 'text/csv' || ext === 'application/csv'){
      msgLabel.innerHTML = ''
      progressBar.value = 20
      return true
    }else{
      msgLabel.innerHTML = 'file is NOT csv!'
      return false
    }
  }

  function validateTimeColumn(csvFile){
    progressBar.value = 40
    return true
  }

function runPythonCode(type, file, ref_col, min_sup, min_rep){
  let pythonProcess = spawn('python',["./assets/python/border_tgraank.py", type, file, ref_col, min_sup, min_rep])

  pythonProcess.stdout.on('data', (data) => {
      // Do something with the data returned from python script

      document.getElementById('text-result').innerHTML = `${data}`
      showResultContent()
  })

  /*let options = {
    mode: 'text',
    pythonOptions: ['-u'],
    scriptPath: './assets/python/',
    args: [type, file, ref_col, min_sup, min_rep]
  }

  pyshell.run('test.py', options, function (err, results) {
    if (err)
      throw err;
    // Results is an array consisting of messages collected during execution
    //console.log('results: %j', results);
    data = "trying to get results ..."
    document.getElementById('text-result').innerHTML = `${data}`
    showResultContent()
  })*/

}
