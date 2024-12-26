const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')

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
  assert(urls.includes('https://www.youtube.com/@HakanYalcinkaya/playlists'))
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

after(async () => {
  await mongoose.connection.close()
})
