export async function loadImage(url, timeoutMs = 15000) {
  const image = new Image();
  let timer;
  try {
    image.src = url;
    await Promise.race([
      image.decode(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Artwork request timed out')), timeoutMs); })
    ]);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Artwork is empty');
    return image;
  } finally { clearTimeout(timer); }
}
