const path = require('path')
const {ipcRenderer} = require('electron')
const tooltip = require('electron-tooltip')
const mime = require('mime')
const csvJson = require('csvtojson')

const selectPattern = document.querySelector('.dropdown-menu')
const selectDirBtn = document.getElementById('select-directory')
const uploadFile = document.getElementById('upload-file')
const runPattern = document.getElementById('run-algorithm')
const runPattern1 = document.getElementById('run-algorithm1')

const msgLabel = document.getElementById('show-message')

let gradualEP = false
let file1 = ''
let file2 = ''

tooltip({
    //
})

// ------------------------ Listeners ------------------------------------

selectPattern.addEventListener('click', (event) => {
  if(event.target.dataset.value){
    document.getElementById('pattern-type').innerHTML = `${event.target.dataset.value} Patterns`
    //if (!gradualEP){
    gradualEP = false
    msgLabel.innerHTML = ''
    closeResultContent()
    closeProgress()
    closeSpecifications()
    //}
  }
})

selectDirBtn.addEventListener('click', (event) => {
  ipcRenderer.send('open-file-dialog')
})

uploadFile.addEventListener('click', (event) => {
  csvFile = selectDirBtn.value
  msgLabel.innerHTML = ''
  if (gradualEP){
    showProgress()
    isCSV = checkFile(csvFile)
    if (isCSV){
      file2 = csvFile
    }else {
      file2 = ''
    }
  }else{
    closeResultContent()
    showSpecifications(csvFile)
  }
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
  python_path = path.join(__dirname, '../python_modules/src/border_tgraank.py')
  python_file = 'border_tgraank.py'
  req = [python_path, type, file, (ref_col-1), min_sup, min_rep]
  //console.log(req)
  runPythonCode(req)
})

runPattern1.addEventListener('click', (event) => {

  file = selectDirBtn.value
  min_sup = document.getElementById('input-sup1').value

  patternType = document.getElementById('pattern-type').innerHTML
  if(patternType === 'Emerging Patterns'){
    type = 11
    if (file1 != ''){
      if (file2 != '' && file1 != file2){
        showProgress()
        validateTimeColumn(file2)
        .then((hasTime) => {
          if (hasTime){
            file2 = ''
            msg = 'columns in csv file not matching previous file...<br>upload another file'
            requestFile(msg)
          }else {
            python_path = path.join(__dirname, '../python_modules/src/graank.py')
            python_file = 'graank.py'
            req = [python_path, type, file1, file2, min_sup]
            runPythonCode(req)
            file1 = ''
            file2 = ''
            gradualEP = false
          }
        })
        .catch((err) => {
          file2 = ''
          msg = 'sorry system error...upload another file'
          requestFile(msg)
        })
      }else {
        file2 = ''
        msg = 'file is blank or may be similar to previous file...<br>upload another file'
        requestFile(msg)
      }
    }else{
      file1 = file
      file2 = ''
      msg = 'Please upload 2nd file'
      requestFile(msg)
      gradualEP = true
    }
  }else{
    type = 1
    showProgress()
    python_path = path.join(__dirname, '../python_modules/src/graank.py')
    python_file = 'graank.py'
    req = [python_path, type, file, min_sup]
    runPythonCode(req)
  }
})

ipcRenderer.on('selected-directory', (event, path) => {
  selectDirBtn.value = `${path}`
  if (!gradualEP){
    msgLabel.innerHTML = ''
    closeResultContent()
    closeProgress()
    closeSpecifications()
  }
})

// --------------------- Views ----------------------------------


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
  showProgress()
  isCSV = checkFile(file)
  if (isCSV){
    validateTimeColumn(file)
    .then((isValid) => {
      closeProgress()
      if (isValid){
        showTemporalSpecifications()
      }else {
        showGradualSpecifications()
      }
    })
    .catch((err) => {
      console.err(err)
      msgLabel.innerHTML = '<p>sorry, an error occured</p>'
      closeProgress()
    })
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
      msgLabel.innerHTML = '<p style="color: green;">csv file verified &#128077</p>'
      closeProgress()
      return true
    }else{
      msgLabel.innerHTML = '<p>file is NOT csv! &#128577</p>'
      closeProgress()
      return false
    }
  }

// ----------------------- upload another file ---------------------------------

function requestFile(msg){
  msgLabel.innerHTML = '<p>' + msg + '</p>'
  selectDirBtn.value = ''
  closeProgress()
}

// ----------------------- main tasks ------------------------------------------

async function validateTimeColumn(csvFile){
    const dateReg = /(0?[1-9]|[12]\d|30|31)[^\w\d\r\n:](0?[1-9]|1[0-2])[^\w\d\r\n:](\d{4}|\d{2})/
    const time12Reg = /^(?:1[0-2]|0?[0-9]):[0-5][0-9]:[0-5][0-9]$/
    const time24Reg = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]:[0-5][0-9]$/
    const jsonArray = await getJson(csvFile)

    try {
      for (key in jsonArray[0]){
        if (jsonArray[0][key].match(dateReg) || jsonArray[0][key].match(time12Reg) || jsonArray[0][key].match(time24Reg)){
          //console.log(jsonArray[0][key])
          return true
        }
      }
      //throw new Error("")
      return false
    }catch (err){
      console.error("Error: ", data.toString())
      msgLabel.innerHTML = '<p>sorry, an error occured</p>'
      closeProgress()
    }
  }

function getJson(csvPath){
  return csvJson({delimiter: [";",",",' ',"\t"]}).fromFile(csvPath)
}


/*function runPythonCode(py_file, req){
  let pyShell = require('python-shell')

  let options = {
    mode: 'text',
    //pythonPath: path.join(__dirname,'../python_modules/bin/python'),
    pythonOptions: ['-u'], // get print results in real-time
    scriptPath: path.join(__dirname,'../python_modules/src'),
    args: req
  }

  //req[0] = 'border_tgraank.py'
  pyShell.PythonShell.run(py_file, options, function(err, data){
    if (err) {
      console.error("Error: ", err)
      msgLabel.innerHTML = '<p>sorry, an error occured</p><br>'+err
      closeProgress()
      throw err
    }

    out_str = ""
    data.forEach(function(line){
      out_str += line
    })

    // data is an array consisting of messages collected during execution
    document.getElementById('text-result').innerHTML = `${out_str}`
    showResultContent()
    closeProgress()
    console.log('results: %j', data)
  })
}*/

function runPythonCode(request){
  let spawn = require('child_process').spawn
  let pythonProcess = spawn('python', request)
  pythonProcess.stdout.on('data', (data) => {
      // Do something with the data returned from python script
      document.getElementById('text-result').innerHTML = `${data}`
      showResultContent()
      closeProgress()
  })
  pythonProcess.stderr.on('data', (data) => {
    console.error("Error: ", data.toString())
    msgLabel.innerHTML = '<p>sorry, an error occured</p><br>'+data.toString()
    closeProgress()
  })
  pythonProcess.on('close', (code) => {
    console.log("Child exited with code ", code)
  })
}
