import sys
from PIL import Image
import numpy as np

def bayer_dither(image):
    # Convert image to grayscale numpy array
    gray = image.convert('L')
    img_arr = np.array(gray, dtype=np.float32) / 255.0
    
    # 4x4 Bayer matrix for ordered dithering
    bayer_matrix = np.array([
        [ 0,  8,  2, 10],
        [12,  4, 14,  6],
        [ 3, 11,  1,  9],
        [15,  7, 13,  5]
    ]) / 16.0
    
    h, w = img_arr.shape
    
    # Create the output array
    out = np.zeros_like(img_arr)
    
    for y in range(h):
        for x in range(w):
            threshold = bayer_matrix[y % 4, x % 4]
            if img_arr[y, x] > threshold:
                out[y, x] = 1.0
            else:
                out[y, x] = 0.0
                
    # Convert back to uint8
    return Image.fromarray((out * 255).astype(np.uint8), mode='L').convert('1')

def floyd_steinberg(image):
    return image.convert('1')

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python bitmap.py <input> <output> [--bayer | --fs]")
        sys.exit(1)
        
    in_path = sys.argv[1]
    out_path = sys.argv[2]
    method = '--bayer'
    if len(sys.argv) > 3:
        method = sys.argv[3]
        
    img = Image.open(in_path)
    
    # Handle alpha channel (don't dither the transparent background)
    alpha = None
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        img_rgba = img.convert('RGBA')
        alpha = img_rgba.split()[3]
        # Create a white background for dithering
        bg = Image.new('RGBA', img_rgba.size, (255, 255, 255, 255))
        img = Image.alpha_composite(bg, img_rgba).convert('RGB')
    else:
        img = img.convert('RGB')
        
    if method == '--fs':
        out_img = floyd_steinberg(img)
    else:
        out_img = bayer_dither(img)
        
    # Re-apply alpha if it existed
    if alpha:
        out_img = out_img.convert('RGBA')
        out_img.putalpha(alpha)
        
    out_img.save(out_path)
    print(f"Saved {method} bitmapped image to {out_path}")
