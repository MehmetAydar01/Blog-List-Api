const logger = require('./logger')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

// Validasyon middleware'ı
const validateUser = (request, response, next) => {
  const { password } = request.body

  if (!password || password.length < 3) {
    return response.status(400).json({
      error: 'password must be at least 3 characters long',
    })
  }

  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return response.status(400).json({
      error:
        'Password must contain at least one uppercase letter and one number',
    })
  }

  next()
}

// Token Extractor
const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')

  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '')
  }

  next()
}

// User Extractor
const userExtractor = async (request, response, next) => {
  const decodedToken = jwt.verify(request.token, process.env.SECRET)

  if (!decodedToken.id) {
    return response.status(401).json({
      error: 'token invalid',
    })
  }

  const user = await User.findById(decodedToken.id)

  request.user = user
  next()
}

const unkownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  logger.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (
    error.name === 'MongoServerError' &&
    error.message.includes('E11000 duplicate key error')
  ) {
    return response.status(400).json({
      error: 'expected `username` to be unique',
    })
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({
      error: 'token invalid',
    })
  } else if (error.name === 'TokenExpiredError') {
    return response.status(401).json({
      error: 'token expired',
    })
  }
  next(error)
}

module.exports = {
  validateUser,
  tokenExtractor,
  userExtractor,
  unkownEndpoint,
  errorHandler,
}
