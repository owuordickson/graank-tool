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

  file = selectDirBtn.value
  ref_col = document.getElementById('input-ref').value
  min_sup = document.getElementById('input-sup').value
  min_rep = document.getElementById('input-rep').value

  patternType = document.getElementById('pattern-type').innerHTML
  if(patternType === 'Emerging Patterns'){
    type = 12
  }else{
    type = 2
  }
  showProgress()
  req = ["./assets/python/border_tgraank.py", type, file, (ref_col-1), min_sup, min_rep]
  //console.log(req)
  runPythonCode(req)
})

runPattern1.addEventListener('click', (event) => {

  file = selectDirBtn.value
  min_sup = document.getElementById('input-sup1').value

  patternType = document.getElementById('pattern-type').innerHTML
  if(patternType === 'Emerging Patterns'){
    type = 11
  }else{
    type = 1
  }
  showProgress()
  req = ["./assets/python/graank.py", type, file, min_sup]
  runPythonCode(req)
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

  isCSV = checkFile(file)
  if (isCSV){
    validateTimeColumn(file)
  }
  closeProgress()
}

function showGradualSpecifications(){
  specsGradual = document.querySelector('.grid-specs-gradual-group.is-shown')
  specsTemporal = document.querySelector('.grid-specs-temporal-group.is-shown')
  if(!specsGradual){
    specsGradual = document.querySelector('.grid-specs-gradual-group')
    specsGradual.classList.add('is-shown')
  }
  if(specsTemporal){
    specsTemporal.classList.remove('is-shown')
  }
}

function showTemporalSpecifications(){
  specsGradual = document.querySelector('.grid-specs-gradual-group.is-shown')
  specsTemporal = document.querySelector('.grid-specs-temporal-group.is-shown')
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
      specsGradual.classList.remove('is-shown')
    }
    if(specsTemporal){
      specsTemporal.classList.remove('is-shown')
    }

  }

function checkFile(file){
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

function validateTimeColumn(csvFile){
    type = 21
    let fileProcess = spawn('python',["./assets/python/border_tgraank.py", type, csvFile])
    //result = ''
    fileProcess.stdout.on('data', (data) => {
        // Do something with the data returned from python script
        //msgLabel.innerHTML = `${data}`
        result = data.toString()
        console.log(result)
        result = true

        if (result){
          showTemporalSpecifications()
        }else{
          showGradualSpecifications()
        }
    })
  }

//function runPythonCode(type, file, ref_col, min_sup, min_rep){
  //let pythonProcess = spawn('python',["./assets/python/border_tgraank.py", type, file, ref_col, min_sup, min_rep])
function runPythonCode(request){
  let pythonProcess = spawn('python', request)
  pythonProcess.stdout.on('data', (data) => {
      // Do something with the data returned from python script
      document.getElementById('text-result').innerHTML = `${data}`
      showResultContent()
      closeProgress()
  })
}
