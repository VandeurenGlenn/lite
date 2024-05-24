export default (items: any[], fn) => items && items.map((item, i) => fn(item, i))
