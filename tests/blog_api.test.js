const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')

describe('when there are some blogs saved initially', () => {
  beforeEach(async () => {
    await Blog.deleteMany({})
    await Blog.insertMany(helper.initialBlogs)
  })

  test('blog lists are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs')

    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  describe('viewing a spesific blog', () => {
    test('a specific blog is within the returned blogs', async () => {
      const response = await api.get('/api/blogs')

      const urls = response.body.map((u) => u.url)

      assert(urls.includes('https://www.youtube.com/c/ArinYazilim/playlists'))
    })

    test('verify that the id field exists instead of the _id field', async () => {
      const response = await api.get('/api/blogs')

      const firstBlogObj = response.body[0]

      assert(firstBlogObj.id)
      assert.strictEqual(firstBlogObj._id, undefined)

      const blogFromDb = await helper.getBlogInDb(firstBlogObj.id)

      assert(blogFromDb.id)
      assert.strictEqual(blogFromDb.id, firstBlogObj.id)
      assert.strictEqual(blogFromDb._id, undefined)
    })
  })

  describe('addition of a new blog', () => {
    test('a valid blog can be added', async () => {
      const newBlogObj = {
        title: 'Hakan Yalçınkaya harika bir eğitmen',
        author: 'Hakan Yalçınkaya',
        url: 'https://www.youtube.com/@HakanYalcinkaya/playlists',
        likes: 44,
      }

      await api
        .post('/api/blogs')
        .send(newBlogObj)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

      const urls = blogsAtEnd.map((u) => u.url)
      assert(
        urls.includes('https://www.youtube.com/@HakanYalcinkaya/playlists')
      )
    })

    test('if there is no likes property', async () => {
      const newBlogObj = {
        title: 'Mehmet Aydar test çalışıyor',
        author: 'Mehmet Aydar',
        url: 'https://social-links-profile-fr.netlify.app/',
      }

      const response = await api
        .post('/api/blogs')
        .send(newBlogObj)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.likes, 0)
    })

    test('if there is no title or url property', async () => {
      const newBlogObj = {
        title: 'Url yok title var',
        author: 'Mehmet Aydar',
      }

      await api.post('/api/blogs').send(newBlogObj).expect(400)

      const blogs = await helper.blogsInDb()
      assert.strictEqual(helper.initialBlogs.length, blogs.length)
    })
  })

  describe('deletion of a blog', () => {
    test('succeeds with status code 204 if id is valid', async () => {
      const response = await helper.blogsInDb()
      const blogToDelete = response[0]

      await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)

      const urls = blogsAtEnd.map((u) => u.url)
      assert(!urls.includes(blogToDelete.url))
    })
  })

  describe('updating of a blog', () => {
    test('PUT /api/blogs/:id - successful update', async () => {
      const response = await helper.blogsInDb()
      const blogToUpdate = response[0]

      const updatedBlog = {
        title: blogToUpdate.title,
        author: blogToUpdate.author,
        url: blogToUpdate.url,
        likes: 30,
      }

      const updatedResponse = await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send(updatedBlog)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(updatedResponse.body.likes, 30)
      assert.strictEqual(updatedResponse.body.id, blogToUpdate.id)
    })

    test('PUT /api/blogs/:id - invalid id', async () => {
      const invalidId = '12345' // Geçersiz MongoDB ObjectId

      const blog = {
        author: 'mehmet',
        title: 'sagopa',
        url: 'link',
        likes: 7,
      }

      const response = await api
        .put(`/api/blogs/${invalidId}`)
        .send(blog)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.error, 'malformatted id')
    })

    test('PUT /api/blogs/:id - not found', async () => {
      const validNonexistingId = await helper.nonExistingId() // Geçerli ama var olmayan ID

      const blog = {
        author: 'mehmet',
        title: 'sagopa',
        url: 'link',
        likes: 7,
      }

      const response = await api
        .put(`/api/blogs/${validNonexistingId}`)
        .send(blog)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.error, 'Blog not found')
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})
