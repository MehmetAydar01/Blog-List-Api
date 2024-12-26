const Blog = require('../models/blog')

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

const blogsInDb = async () => {
  const blogs = await Blog.find({})
  return blogs.map((blog) => blog.toJSON())
}

const getBlogInDb = async (id) => {
  const blog = await Blog.findOne({ _id: id })
  return blog.toJSON()
}

module.exports = {
  initialBlogs,
  blogsInDb,
  getBlogInDb,
}
