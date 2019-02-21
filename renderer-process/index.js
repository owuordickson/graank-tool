const {ipcRenderer} = require('electron')
const tooltip = require('electron-tooltip')
let spawn = require('child_process').spawn
//let pyshell = require('python-shell')

let csvFile = ""

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
  closeResultContent()
  showSpecifications()
})

runPattern.addEventListener('click', (event) => {
  //showResultContent()
  type = 1
  file = csvFile
  ref_col = 0
  min_sup = 0.2
  min_rep = 0.5
  runPythonCode(type, file, ref_col, min_sup, min_rep)
})

ipcRenderer.on('selected-directory', (event, path) => {
  document.getElementById('select-directory').value = `${path}`
  csvFile = path
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

  file = csvFile
  timeExists = checkColumn(file)
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

function  checkColumn(file){
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
