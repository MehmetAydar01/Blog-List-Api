const _ = require('lodash')

const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  const reducer = (acc, curr) => {
    return acc + curr.likes
  }

  return blogs.length === 0 ? 0 : blogs.reduce(reducer, 0)
}

const favoriteBlog = (blogs) => {
  const mostLiked = (acc, curr) => {
    return acc.likes >= curr.likes ? acc : curr
  }

  return blogs.length === 0 ? {} : blogs.reduce(mostLiked, blogs[0])
}

const mostBlogs = (blogs) => {
  const mostBlog = _.maxBy(blogs, 'blogs')

  if (!mostBlog) {
    return {}
  }

  const result = {
    author: mostBlog.author,
    blogs: mostBlog.blogs,
  }

  return result
}

const mostLikes = (blogs) => {
  const mostLiked = _.maxBy(blogs, 'likes')

  if (!mostLiked) {
    return {
      info: 'blog list is empty or likes key is not in the blog list',
    }
  }

  const result = {
    author: mostLiked.author,
    likes: mostLiked.likes,
  }

  return result
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes,
}
