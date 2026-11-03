// 单子（商品）接口（真实后端版）  对应 server/src/routes/products.js
import { get, post } from './request.js'
export { CATEGORIES, SPECS, specPrice } from '../constants.js'

export const listProducts = ({ cat = '', keyword = '', includeOff = false } = {}) => get('/products', { cat, keyword, includeOff: includeOff ? 1 : '' })
export const getProduct = (id) => get(`/products/${id}`)
export const saveProduct = (actor, input) => post('/products', input)
export const toggleSale = (actor, id) => post(`/products/${id}/toggle`)
