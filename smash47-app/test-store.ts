import { useMenuStore } from './src/store/menuStore'
console.log('Store imported')
try {
  useMenuStore.getState().fetchMenu().then(() => {
    console.log('Categories:', useMenuStore.getState().categories.length)
    console.log('Products:', useMenuStore.getState().products.length)
    console.log('IsLoading:', useMenuStore.getState().isLoading)
  })
} catch (e) {
  console.log('Error:', e)
}
