a = [1, 4, 55, 777, 999]
insert = 0

function insertt (a, b) {
  if (a.length == 0) {
    a.push(b)
    return (a)
  }
  pushAt = a.length
  for (i = 0; i < a.length; i++) {
    console.log(a[i], b)
    if (a[i] > b) {
      pushAt = i
      break
    }
  }
  console.log('pushAt', pushAt)
  console.log('a', a)
  a.push(b)
  for (j = a.length - 1; j > pushAt; j--) {
    console.log('j', j)
    a[j] = a[j - 1]
    console.log(a)
  }
  console.log('a', a)
  a[pushAt] = b
  return (a)
}

c = insertt([0, 3, 685], 18)
console.log(c)
