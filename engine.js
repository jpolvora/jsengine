/** @format */

const fs = require('fs')
const path = require('path')
const beautifyJs = require('js-beautify').js
const debug = require('debug')('jsengine')

function requireNoCache(filePath) {
  delete require.cache[require.resolve(filePath)]
  return require(filePath)
}

function generateCode(templateStr, callback) {
  try {
    var re = /<%(.+?)%>/g

    var reExp = /(^( )?(this|var|if|for|else|switch|case|break|{|}|;))(.*)?/g

    var code = 'var $model = this; var r=[];\n'

    var cursor = 0

    var match

    function add(line, js) {
      js
        ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n')
        : (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '')
      return add
    }
    while ((match = re.exec(templateStr))) {
      add(templateStr.slice(cursor, match.index))(match[1], true)
      cursor = match.index + match[0].length
    }
    add(templateStr.substr(cursor, templateStr.length - cursor))
    code = (code + 'return r.join("");').replace(/[\r\t\n]/g, ' ')

    return callback(null, code)
  } catch (error) {
    const msg = process.env.NODE_ENV != 'production' ? error.stack : error.toString()
    const newError = new Error(msg)
    newError.name = 'CodeGenerationError'
    return callback(newError)
  }
}

function createFunction(code, callback) {
  try {
    const fn = new Function(code)
    return callback(null, fn)
  } catch (error) {
    const msg = process.env.NODE_ENV != 'production' ? error.stack : error.toString()
    const newError = new Error(msg)
    newError.name = 'CreateFunctionError'
    return callback(newError)
  }
}

function compileTemplate(templateString, callback) {
  return generateCode(templateString, (err, code) => {
    if (err) return callback(err)
    return callback(null, code)
  })
}

function wrapIntoCommonJs(beauty, code, functionName, callback) {
  try {
    functionName = functionName.trim().replace('-', '_')
    if (beauty) {
      code = beautifyJs(`module.exports = function ${functionName}() { ${code} }`)
    } else {
      code = `module.exports = function ${functionName}() { ${code} }`
    }
    return callback(null, code)
  } catch (error) {
    const msg = process.env.NODE_ENV != 'production' ? error.stack : error.toString()
    const newError = new Error(msg)
    newError.name = 'BeautifyError'
    return callback(newError)
  }
}

function saveAndRequire(beauty, code, fileName) {
  const directory = path.dirname(fileName)
  const newFileName = path.basename(fileName, '.html')
  const newPath = path.join(directory, newFileName) + '.html.js'
  const functionName = '_' + newFileName

  return new Promise((resolve, reject) => {
    return wrapIntoCommonJs(beauty, code, functionName, (error, text) => {
      if (error) {
        const msg = process.env.NODE_ENV != 'production' ? error.stack : error.toString()
        const newError = new Error(msg)
        newError.name = 'wrapIntoCommonJsError'
        return reject(newError)
      }

      if (!text || text.length == 0) return reject(new Error('conteúdo do template vazio!'))
      return fs.writeFile(newPath, text, (err) => {
        if (err) {
          const msg = process.env.NODE_ENV != 'production' ? error.stack : error.toString()
          const newError = new Error(msg)
          newError.name = 'WriteFileError'
          return reject(newError)
        }
        debug('Arquivo escrito com sucesso: ', newPath)
        try {
          const moduleExport = requireNoCache(newPath)
          if (typeof moduleExport !== 'function') throw new Error('Não recebeu uma função!')
          return resolve(moduleExport)
        } catch (error) {
          const msg = process.env.NODE_ENV != 'production' ? error.stack : error.toString()
          const newError = new Error(msg)
          newError.name = 'RequireModuleError'
          return reject(newError)
        }
      })
    })
  })
}

module.exports = {
  compile: (templateString) => {
    return new Promise((resolve, reject) => {
      return compileTemplate(templateString, (err, code) => {
        if (err) return reject(err)
        return createFunction(code, (err, fn) => {
          if (err) return reject(err)
          return resolve(fn)
        })
      })
    })
  },

  compileAndSave: (beauty, templateString, path) => {
    return new Promise((resolve, reject) => {
      return compileTemplate(templateString, (err, code) => {
        if (err) return reject(err)
        return saveAndRequire(beauty, code, path)
          .then((fn) => {
            return resolve(fn)
          })
          .catch((err) => {
            return reject(err)
          })
      })
    })
  }
}
