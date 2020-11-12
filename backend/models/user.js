
  const userModel = `
    rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    activated INTEGER,
    username TEXT NOT NULL UNIQUE, 
    password TEXT NOT NULL, 
    createdAt INTEGER, 
    updatedAt INTEGER
  `

module.exports = { userModel }