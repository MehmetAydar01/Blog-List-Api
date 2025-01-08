const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const middleware = require('../utils/middleware')

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

blogsRouter.post('/', middleware.userExtractor, async (request, response) => {
  const body = request.body

  // userExtractor middleware'inda ayarladık request.user'i
  const user = request.user // Middleware sayesinde kullanıcımız hazır

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes || 0,
    user: user._id,
  })
  const savedBlog = await blog.save()

  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()

  response.status(201).json(savedBlog)
})

blogsRouter.delete(
  '/:id',
  middleware.userExtractor,
  async (request, response) => {
    // userExtractor middleware'inda ayarladık request.user'i
    const user = request.user // Middleware sayesinde kullanıcımız hazır

    const blog = await Blog.findById(request.params.id)

    if (!blog) {
      return response.status(404).json({
        error: 'blog not found',
      })
    }

    // Blog sahibini kontrol et
    if (blog.user.toString() !== user._id.toString()) {
      return response.status(403).json({
        error: 'you cannot delete this blog',
      })
    }

    await Blog.findByIdAndDelete(blog._id)

    // Bloğu Kullanıcının blogs listesinden sil
    user.blogs = user.blogs.filter(
      (userBlogId) => userBlogId.toString() !== blog._id.toString()
    )

    await user.save()

    response.status(204).end()
  }
)

blogsRouter.put('/:id', async (request, response) => {
  const body = request.body

  const blog = {
    ...body,
  }

  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, {
    new: true,
    runValidators: true,
    context: 'query',
  })

  if (!updatedBlog) {
    return response.status(404).json({ error: 'Blog not found' })
  }

  response.json(updatedBlog)
})

module.exports = blogsRouter
