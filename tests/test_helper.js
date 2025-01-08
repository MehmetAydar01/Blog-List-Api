const Blog = require('../models/blog')
const User = require('../models/user')
const jwt = require('jsonwebtoken')

const initialBlogs = [
  {
    title: 'Arin Yazilim channel is one of the best youtube channels',
    author: 'Gürcan Çekiç',
    url: 'https://www.youtube.com/c/ArinYazilim/playlists',
    likes: 44,
  },
  {
    title: '2024 is here, should I choose Shadcn UI?',
    author: 'Osama',
    url: 'https://medium.com/@osamajavaid/2024-is-here-should-i-choose-shadcn-ui-86fe3a179f6c',
    likes: 14,
  },
]

const generateToken = (user) => {
  const userForToken = {
    username: user.username,
    id: user._id,
  }

  const token = jwt.sign(userForToken, process.env.SECRET, {
    expiresIn: 60 * 60,
  })

  return token
}

const blogsInDb = async () => {
  const blogs = await Blog.find({})
  return blogs.map((blog) => blog.toJSON())
}

const getBlogInDb = async (id) => {
  const blog = await Blog.findOne({ _id: id })
  return blog.toJSON()
}

const nonExistingId = async () => {
  const newBlog = new Blog({
    author: 'mehmet',
    title: 'sagopa',
    url: 'link',
    likes: 7,
    user: '6776cb2b212882654ff88795',
  })
  await newBlog.save()
  await newBlog.deleteOne()

  return newBlog._id.toString()
}

const usersInDb = async () => {
  const users = await User.find({})
  return users.map((user) => user.toJSON())
}

module.exports = {
  initialBlogs,
  generateToken,
  blogsInDb,
  getBlogInDb,
  nonExistingId,
  usersInDb,
}
