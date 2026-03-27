import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// Cards
export const searchCards = (q, page = 1, order = 'name') =>
  api.get('/cards/search', { params: { q, page, order } }).then(r => r.data)

export const autocomplete = (q) =>
  api.get('/cards/autocomplete', { params: { q } }).then(r => r.data)

export const getCard = (id) =>
  api.get(`/cards/${id}`).then(r => r.data)

export const getSets = () =>
  api.get('/cards/sets').then(r => r.data)

// Collection
export const getCollection = (params = {}) =>
  api.get('/collection', { params }).then(r => r.data)

export const addToCollection = (entry) =>
  api.post('/collection', entry).then(r => r.data)

export const updateCollectionEntry = (id, update) =>
  api.patch(`/collection/${id}`, update).then(r => r.data)

export const deleteCollectionEntry = (id) =>
  api.delete(`/collection/${id}`)

export const getCollectionStats = () =>
  api.get('/collection/stats').then(r => r.data)

// Locations
export const getLocations = () =>
  api.get('/locations').then(r => r.data)

export const createLocation = (loc) =>
  api.post('/locations', loc).then(r => r.data)

export const updateLocation = (id, loc) =>
  api.patch(`/locations/${id}`, loc).then(r => r.data)

// Decks
export const getDecks = (params = {}) =>
  api.get('/decks', { params }).then(r => r.data)

export const createDeck = (deck) =>
  api.post('/decks', deck).then(r => r.data)

export const getDeck = (id) =>
  api.get(`/decks/${id}`).then(r => r.data)

export const updateDeck = (id, update) =>
  api.patch(`/decks/${id}`, update).then(r => r.data)

export const deleteDeck = (id) =>
  api.delete(`/decks/${id}`)

export const getDeckEntries = (deckId, params = {}) =>
  api.get(`/decks/${deckId}/entries`, { params }).then(r => r.data)

export const addDeckEntry = (deckId, entry) =>
  api.post(`/decks/${deckId}/entries`, entry).then(r => r.data)

export const updateDeckEntry = (deckId, entryId, update) =>
  api.patch(`/decks/${deckId}/entries/${entryId}`, update).then(r => r.data)

export const deleteDeckEntry = (deckId, entryId) =>
  api.delete(`/decks/${deckId}/entries/${entryId}`)

export const getDeckAnalysis = (deckId) =>
  api.get(`/decks/${deckId}/analysis`).then(r => r.data)

export const getDeckMissing = (deckId) =>
  api.get(`/decks/${deckId}/missing`).then(r => r.data)

export const getDeckRefile = (deckId) =>
  api.get(`/decks/${deckId}/refile`).then(r => r.data)

// Import
export const importManabox = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/import/manabox', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export default api
