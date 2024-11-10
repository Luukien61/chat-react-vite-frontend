
const WhitePage = () => {
  const location = window.location.href // Để lấy đường dẫn hiện tại
  const newUrl = location.replace('http://localhost:5173/google','http://localhost:5173/#/google')
  window.location.replace(newUrl);

  return (
    <div>
    </div>
  )
}

export default WhitePage
