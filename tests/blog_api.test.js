const { test, after, beforeEach, describe, before } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)
const bcrypt = require('bcrypt')

const Blog = require('../models/blog')
const User = require('../models/user')

let token

describe('when there are some blogs saved initially', () => {
  beforeEach(async () => {
    // Veritabanını temizle
    await Blog.deleteMany({})
    await User.deleteMany({})

    // Kullanıcı oluştur
    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })
    await user.save()

    // Token oluştur
    token = helper.generateToken(user)

    // Örnek başlangıç blogları ekle
    helper.initialBlogs = helper.initialBlogs.map((item, i) => {
      return i === 1
        ? { ...item, user: '677dbb524d969ad353823d55' }
        : { ...item, user: user._id.toString() }
    })

    await Blog.insertMany(helper.initialBlogs)
  })

  test('blog lists are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('blog lists are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('all blogs are returned', async () => {
    const result = await helper.blogsInDb()

    assert.strictEqual(result.length, helper.initialBlogs.length)
  })

  describe('viewing a spesific blog', () => {
    test('a specific blog is within the returned blogs', async () => {
      const result = await helper.blogsInDb()

      const urls = result.map((u) => u.url)

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
    test('if the user does not have a token', async () => {
      const blogsAtStart = await helper.blogsInDb()

      const newBlog = {
        title: 'Hakan Yalçınkaya harika bir eğitmen',
        author: 'Hakan Yalçınkaya',
        url: 'https://www.youtube.com/@HakanYalcinkaya/playlists',
        likes: 44,
      }

      const response = await api
        .post('/api/blogs')
        .set('Authorization', '')
        .expect(401)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()

      assert.strictEqual(response.body.error, 'token invalid')
      assert.strictEqual(blogsAtEnd.length, blogsAtStart.length)
    })

    test('if the token expires', async () => {
      const blogsAtStart = await helper.blogsInDb()

      const newBlog = {
        title: 'token expire olursa',
        author: 'Mehmet Aydar',
        url: 'https://www.youtube.com/watch?v=-26ABn7kQ_0&list=PLQzgm1ppOxf6R0HCTFXaHrJXIuZSj52f1',
        likes: 936,
      }

      const response = await api
        .post('/api/blogs')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRlbmVtZSIsImlkIjoiNjc3ZGJiNTI0ZDk2OWFkMzUzODIzZDU1IiwiaWF0IjoxNzM2MjkzMjYxLCJleHAiOjE3MzYyOTMyNzF9.TQsZC8bKovKzc8idcMS5fOIAgogWgtZsdY7woSZjFwQ'
        )
        .expect(401)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()

      assert.strictEqual(response.body.error, 'token expired')
      assert.strictEqual(blogsAtEnd.length, blogsAtStart.length)
    })

    test('a valid blog can be added', async () => {
      const blogsAtStart = await helper.blogsInDb()

      const newBlog = {
        title: 'Hakan Yalçınkaya harika bir eğitmen',
        author: 'Hakan Yalçınkaya',
        url: 'https://www.youtube.com/@HakanYalcinkaya/playlists',
        likes: 44,
      }

      // Blog ekleme isteği gönder
      const response = await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`) // Token gönder
        .send(newBlog)
        .expect(201) // HTTP 201 Created bekleniyor
        .expect('Content-Type', /application\/json/)

      // Yeni blog verisini kontrol et
      assert.strictEqual(response.body.title, newBlog.title)
      assert.strictEqual(response.body.author, newBlog.author)
      assert.strictEqual(response.body.likes, newBlog.likes)
      assert.strictEqual(response.body.url, newBlog.url)

      // Veritabanındaki blogların güncel durumu
      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, blogsAtStart.length + 1)

      const urls = blogsAtEnd.map((u) => u.url)
      assert(urls.includes(newBlog.url))
    })

    test('if there is no likes property', async () => {
      const newBlog = {
        title: 'Mehmet Aydar test çalışıyor',
        author: 'Mehmet Aydar',
        url: 'https://social-links-profile-fr.netlify.app/',
      }

      const response = await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.likes, 0)
    })
  })

  describe('deletion of a blog', () => {
    test('if there is no blog', async () => {
      const nonExistingBlog = await helper.nonExistingId()
      const blogsAtStart = await helper.blogsInDb()

      const response = await api
        .delete(`/api/blogs/${nonExistingBlog}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()

      assert.strictEqual(response.body.error, 'blog not found')
      assert.strictEqual(blogsAtEnd.length, blogsAtStart.length)
    })

    test('if the user does not have permission to delete the blog', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToBeDeleted = blogsAtStart[1]

      const response = await api
        .delete(`/api/blogs/${blogToBeDeleted.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()

      assert.strictEqual(response.body.error, 'you cannot delete this blog')
      assert.strictEqual(blogsAtEnd.length, blogsAtStart.length)
    })

    test('succeeds with status code 204 if id is valid', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToBeDeleted = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToBeDeleted.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204)

      const blogsAtEnd = await helper.blogsInDb()
      const urls = blogsAtEnd.map((u) => u.url)

      assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)
      assert(!urls.includes(blogToBeDeleted.url))
    })
  })

  describe('updating of a blog', () => {
    test('PUT /api/blogs/:id - successful update', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToUpdate = blogsAtStart[0]

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

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Mehmet Aydar Test',
      username: 'QXyGeN',
      password: 'A1b',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

    const usernames = usersAtEnd.map((u) => u.username)
    assert(usernames.includes(newUser.username))
  })

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Ali Aksan',
      username: 'root',
      password: 'Ali12',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()

    assert(result.body.error.includes('expected `username` to be unique'))
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('If the username is not present', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Mehmet Bakır',
      password: 'Memo01',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()

    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('If the username is less than 3 letters', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Serkan Ay',
      username: 'sa',
      password: 'Serkan15',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()

    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('if the password is less than 3 letters', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Erkan Ayvaz',
      username: 'erko baskan',
      password: '99',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()

    assert.strictEqual(
      result.body.error,
      'password must be at least 3 characters long'
    )
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('if the password is not present', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Erkan Ayvaz',
      username: 'erko baskan',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()

    assert.strictEqual(
      result.body.error,
      'password must be at least 3 characters long'
    )
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('If the password exists but does not meet the valid conditions', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Cumali Demir',
      username: 'cumo reis',
      password: '720156',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()

    assert.strictEqual(
      result.body.error,
      'Password must contain at least one uppercase letter and one number'
    )
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })
})

after(async () => {
  await User.deleteMany({})
  await mongoose.connection.close()
})
