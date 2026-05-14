Pixel Lab API
The API provides endpoints for creating AI-generated pixel art images, rotations, animations, and more. Making it easy for applications to integrate pixel art generation capabilities.

Python Client
For convenience, a Python client library is available to simplify integration with your applications. Visit our GitHub repository for installation instructions and examples.

pip install pixellab
Authentication
The API uses a simple token based authentication system. After creating an account, you can find your API token in your account settings. Include this token in all API requests using the Bearer authentication scheme:

curl -X POST https://api.pixellab.ai/v1/generate-image-pixflux \
    -H "Authorization: Bearer YOUR_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "description": "cute dragon",
        "image_size": {"width": 128, "height": 128}
    }'
Or use the Python client:

import pixellab

client = pixellab.Client(secret="YOUR_API_TOKEN")
client.generate_image_pixflux(
    description="cute dragon",
    image_size=dict(width=128, height=128),
)
Supported models
Generate Image Bitforge: Apply custom art styles using reference images.
Generate Image Pixflux: Generate pixel art from text descriptions.
Animate (skeleton): Generate 4 frames of an animation from skeleton poses.
Animate (text): Generate animation from text descriptions.
Inpaint: Edit and modify existing pixel art.
Rotate: Rotate an object or a character.
Server
Server:
https://api.pixellab.ai/v1

Authentication
SelectAuth Type
No authentication selected
Client Libraries
Shell Curl
Generate Image ​Copy link
Generate ImageOperations
post
/generate-image-pixflux
post
/generate-image-bitforge
Generate image (pixflux)​Copy link
Creates a pixel art image based on the provided parameters. Called "Create image (new)" in the plugin.

Supported image size:

Minimum area 32x32 and maximum area 400x400
Supported features:

Init image
Forced palette
Transparent background
Using the Python client:

import pixellab

client = pixellab.Client(secret="YOUR_API_TOKEN")

response = client.generate_image_pixflux(
    description="cute dragon",
    image_size=dict(width=128, height=128),
)
response.image.pil_image()
Body
required
application/json
Request model for pixflux image generation endpoint

descriptionCopy link to description
Type:string · Description
required
Text description of the image to generate

image_sizeCopy link to image_size
Type:object · app__endpoints__external__v1__generate_image_pixflux__ImageSize
required
Example
Show ImageSizefor image_size
color_imageCopy link to color_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor color_image
detailCopy link to detail
Type:string · Detail
enum
nullable
Detail style reference (weakly guiding)

low detail
medium detail
highly detailed
directionCopy link to direction
Type:string · Direction
enum
nullable
Subject direction (weakly guiding)

north
north-east
east
south-east
south
south-west
west
north-west
init_imageCopy link to init_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor init_image
init_image_strengthCopy link to init_image_strength
Type:integer · Init Image Strength
min:  
1
max:  
999
default: 
300
Strength of the initial image influence

isometricCopy link to isometric
Type:boolean · Isometric
default: 
false
Generate in isometric view (weakly guiding)

negative_descriptionCopy link to negative_description
Type:string · Negative Description
default: 
""
(Deprecated)

no_backgroundCopy link to no_background
Type:boolean · No Background
default: 
false
Generate with transparent background, (blank background over 200x200 area)

outlineCopy link to outline
Type:string · Outline
enum
nullable
Outline style reference (weakly guiding)

single color black outline
single color outline
selective outline
lineless
seedCopy link to seed
Type:integer · Seed
nullable
Seed decides the starting noise

Request model for pixflux image generation endpoint

Show additional propertiesfor Request Body
Responses

200
Successfully generated image
application/json
401Copy link to 401
Invalid API token

402Copy link to 402
Insufficient credits

422Copy link to 422
Validation error

429Copy link to 429
Too many requests

529Copy link to 529
Rate limit exceeded

Request Example forpost/generate-image-pixflux
Shell Curl
curl https://api.pixellab.ai/v1/generate-image-pixflux \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "description": "cute dragon",
  "image_size": {
    "height": 128,
    "width": 128
  },
  "no_background": true
}'


Test Request
(post /generate-image-pixflux)
Status:200

{
  "image": {
    "type": "base64",
    "base64": "data:image/png;base64,..."
  },
  "usage": {
    "type": "credits",
    "credits": 1
  }
}

Successfully generated image

Generate image (bitforge)​Copy link
Generates a pixel art image based on the provided parameters. Called "Generate image (style)" in the plugin.

Supported image size:

Maximum area 200x200
Supported features:

Style image
Inpainting
Init image
Forced palette
Transparent background
Using the Python client:

import pixellab

client = pixellab.Client(secret="YOUR_API_TOKEN")

response = client.generate_image_bitforge(
    description="cute dragon",
    image_size=dict(width=128, height=128),
)
response.image.pil_image()
Body
required
application/json
Request model for image generation endpoint

descriptionCopy link to description
Type:string · Description
required
Text description of the image to generate

image_sizeCopy link to image_size
Type:object · app__endpoints__external__v1__generate_image_bitforge__ImageSize
required
Example
Show ImageSizefor image_size
color_imageCopy link to color_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor color_image
coverage_percentageCopy link to coverage_percentage
Type:number · Coverage Percentage
min:  
0
max:  
100
nullable
Percentage of the canvas to cover

detailCopy link to detail
Type:string · Detail
enum
nullable
Detail style reference

low detail
medium detail
highly detailed
directionCopy link to direction
Type:string · Direction
enum
nullable
Subject direction

north
north-east
east
south-east
south
south-west
west
north-west
extra_guidance_scaleCopy link to extra_guidance_scale
Type:number · Extra Guidance Scale
min:  
0
max:  
20
default: 
3
(Deprecated)

init_imageCopy link to init_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor init_image
init_image_strengthCopy link to init_image_strength
Type:integer · Init Image Strength
min:  
1
max:  
999
default: 
300
Strength of the initial image influence

inpainting_imageCopy link to inpainting_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor inpainting_image
isometricCopy link to isometric
Type:boolean · Isometric
default: 
false
Generate in isometric view

mask_imageCopy link to mask_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor mask_image
Request model for image generation endpoint

Show additional propertiesfor Request Body
Responses

200
Successfully generated image
application/json
401Copy link to 401
Invalid API token

402Copy link to 402
Insufficient credits

422Copy link to 422
Validation error

429Copy link to 429
Too many requests

529Copy link to 529
Rate limit exceeded

Request Example forpost/generate-image-bitforge
Shell Curl
curl https://api.pixellab.ai/v1/generate-image-bitforge \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "description": "cute dragon",
  "image_size": {
    "height": 128,
    "width": 128
  },
  "no_background": true,
  "style_guidance_scale": 3,
  "style_strength": 20,
  "text_guidance_scale": 3
}'


Test Request
(post /generate-image-bitforge)
Status:200

{
  "image": {
    "type": "base64",
    "base64": "data:image/png;base64,..."
  },
  "usage": {
    "type": "credits",
    "credits": 1
  }
}

Successfully generated image

Animate ​Copy link
AnimateOperations
post
/animate-with-skeleton
post
/animate-with-text
post
/estimate-skeleton
Generate animation using skeletons​Copy link
Creates a pixel art animation based on the provided parameters. Called "Animate with skeleton" in the plugin.

Supported image sizes:

16x16
32x32
64x64
128x128
256x256
Supported features:

Inpainting
Init image
Forced palette
Using the Python client:

import pixellab

client = pixellab.Client(secret="YOUR_API_TOKEN")

response = client.animate_with_skeleton(
    view="side",
    direction="south",
    image_size=dict(width=64, height=64),
    reference_image=reference_image,
    inpainting_images=existing_animation_frames,
    mask_images=mask_images,
    skeleton_keypoints=skeleton_keypoints,
)
images = [image.pil_image() for image in response.images]
Body
required
application/json
Request model for animation using skeleton endpoint

image_sizeCopy link to image_size
Type:object · app__endpoints__external__v1__animate_with_skeleton__ImageSize
required
Example
Show ImageSizefor image_size
reference_imageCopy link to reference_image
Type:object · Base64Image
required
Reference image

Show Base64Imagefor reference_image
color_imageCopy link to color_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor color_image
directionCopy link to direction
Type:string · Direction
enum
default: 
"east"
Subject direction

north
north-east
east
south-east
south
south-west
west
north-west
guidance_scaleCopy link to guidance_scale
Type:number · Guidance Scale
min:  
1
max:  
20
default: 
4
How closely to follow the reference image and skeleton keypoints

init_image_strengthCopy link to init_image_strength
Type:integer · Init Image Strength
min:  
1
max:  
999
default: 
300
Strength of the initial image influence

init_imagesCopy link to init_images
Type:array object[] | null · Init Images
nullable
Initial images to start the generation from

A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor init_images
inpainting_imagesCopy link to inpainting_images
Type:array · Inpainting Images
default: 
[null,null,null]
Images used for showing the model with connected skeleton

Show Child Attributesfor inpainting_images
isometricCopy link to isometric
Type:boolean · Isometric
default: 
false
Generate in isometric view

mask_imagesCopy link to mask_images
Type:array · Mask Images
Inpainting / mask image (black and white image, where the white is where the model should inpaint)

Show Child Attributesfor mask_images
oblique_projectionCopy link to oblique_projection
Type:boolean · Oblique Projection
default: 
false
Generate in oblique projection

seedCopy link to seed
Type:integer · Seed
nullable
Seed decides the starting noise

Request model for animation using skeleton endpoint

Show additional propertiesfor Request Body
Responses

200
Successfully generated image
application/json
401Copy link to 401
Invalid API token

402Copy link to 402
Insufficient credits

422Copy link to 422
Validation error

429Copy link to 429
Too many requests

529Copy link to 529
Rate limit exceeded

Request Example forpost/animate-with-skeleton
Shell Curl
curl https://api.pixellab.ai/v1/animate-with-skeleton \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "image_size": {
    "height": 64,
    "width": 64
  }
}'


Test Request
(post /animate-with-skeleton)
Status:200

{
  "images": [
    {
      "type": "base64",
      "base64": "data:image/png;base64,..."
    },
    {
      "type": "base64",
      "base64": "data:image/png;base64,..."
    },
    {
      "type": "base64",
      "base64": "data:image/png;base64,..."
    }
  ],
  "usage": {
    "type": "credits",
    "credits": 1
  }
}

Successfully generated image

Generate animation using text description​Copy link
Creates a pixel art animation based on text description and parameters.

Supported image sizes:

64x64
Supported features:

Text-guided animation generation
Inpainting
Init image
Forced palette
Multiple frames
Using the Python client:

import pixellab

client = pixellab.Client(secret="YOUR_API_TOKEN")

response = client.animate_with_text(
    description="human mage",
    action="walk",
    view="side",
    direction="south",
    image_size=dict(width=64, height=64),
    reference_image=reference_image,
    n_frames=4
)
images = [image.pil_image() for image in response.images]
Body
required
application/json
Request model for animation using text endpoint

actionCopy link to action
Type:string · Action
required
Action description

descriptionCopy link to description
Type:string · Description
required
Character description

image_sizeCopy link to image_size
Type:object · app__endpoints__external__v1__animate_with_text__ImageSize
required
Example
Show ImageSizefor image_size
reference_imageCopy link to reference_image
Type:object · Base64Image
required
Reference image

Show Base64Imagefor reference_image
color_imageCopy link to color_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor color_image
directionCopy link to direction
Type:string · Direction
enum
default: 
"east"
Subject direction

north
north-east
east
south-east
south
south-west
west
north-west
image_guidance_scaleCopy link to image_guidance_scale
Type:number · Image Guidance Scale
min:  
1
max:  
20
default: 
1.4
nullable
How closely to follow the reference image

init_image_strengthCopy link to init_image_strength
Type:integer · Init Image Strength
min:  
1
max:  
999
default: 
300
Strength of the initial image influence

init_imagesCopy link to init_images
Type:array object[] | null · Init Images
nullable
Initial images to start the generation from

A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor init_images
inpainting_imagesCopy link to inpainting_images
Type:array · Inpainting Images
default: 
[null,null,null,null]
Existing animation frames to guide the generation

Show Child Attributesfor inpainting_images
mask_imagesCopy link to mask_images
Type:array | null · Mask Images
default: 
[null,null,null,null]
nullable
Inpainting / mask image (black and white image, where the white is where the model should inpaint)

Show Child Attributesfor mask_images
n_framesCopy link to n_frames
Type:integer · N Frames
min:  
2
max:  
20
default: 
4
nullable
Length of full animation (the model will always generate 4 frames)

Request model for animation using text endpoint

Show additional propertiesfor Request Body
Responses

200
Successfully generated animation
application/json
401Copy link to 401
Invalid API token

402Copy link to 402
Insufficient credits

422Copy link to 422
Validation error

429Copy link to 429
Too many requests

529Copy link to 529
Rate limit exceeded

Request Example forpost/animate-with-text
Shell Curl
curl https://api.pixellab.ai/v1/animate-with-text \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "action": "walk",
  "description": "human mage",
  "direction": "south",
  "image_size": {
    "height": 64,
    "width": 64
  },
  "view": "side"
}'


Test Request
(post /animate-with-text)
Status:200

{
  "images": [
    {
      "type": "base64",
      "base64": "data:image/png;base64,..."
    },
    {
      "type": "base64",
      "base64": "data:image/png;base64,..."
    },
    {
      "type": "base64",
      "base64": "data:image/png;base64,..."
    },
    {
      "type": "base64",
      "base64": "data:image/png;base64,..."
    }
  ],
  "usage": {
    "type": "credits",
    "credits": 1
  }
}

Successfully generated animation

Estimate skeleton​Copy link
Estimates the skeleton of a character, returning a list of keypoints to use with the skeleton animation tool.

Supported image sizes:

16x16
32x32
64x64
128x128
256x256
Using the Python client:

import pixellab

client = pixellab.Client(secret="YOUR_API_TOKEN")

response = client.estimate_skeleton(
    image=image_of_the_character_on_a_transparent_background,
)
response.keypoints
Body
required
application/json
Request model for estimate skeleton endpoint

imageCopy link to image
Type:object · Base64Image
Image for which to estimate the skeleton

Show Base64Imagefor image
Responses

200
Successfully generated image
application/json
401Copy link to 401
Invalid API token

402Copy link to 402
Insufficient credits

422Copy link to 422
Validation error

429Copy link to 429
Too many requests

529Copy link to 529
Rate limit exceeded

Request Example forpost/estimate-skeleton
Shell Curl
curl https://api.pixellab.ai/v1/estimate-skeleton \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "image": {
    "type": "base64",
    "base64": ""
  }
}'


Test Request
(post /estimate-skeleton)
Status:200

{
  "image": {
    "type": "base64",
    "base64": "data:image/png;base64,..."
  },
  "usage": {
    "type": "credits",
    "credits": 1
  }
}

Successfully generated image

Rotate ​Copy link
RotateOperations
post
/rotate
Rotate character or object​Copy link
Rotates a pixel art image based on the provided parameters. Called "Rotate" in the plugin.

Supported image sizes:

16x16
32x32
64x64
128x128
Supported features:

Init image
Forced palette
Using the Python client:

import pixellab

client = pixellab.Client(secret="YOUR_API_TOKEN")

response = client.rotate(
    from_view="side",
    to_view="side",
    from_direction="south",
    to_direction="east",
    image_size=dict(width=16, height=16),
    from_image=image_of_subject_facing_south,
)
response.image.pil_image()
Body
required
application/json
Request model for image generation endpoint

from_imageCopy link to from_image
Type:object · Base64Image
required
Reference image to rotate

Show Base64Imagefor from_image
image_sizeCopy link to image_size
Type:object · app__endpoints__external__v1__generate_rotation__ImageSize
required
Example
Show ImageSizefor image_size
color_imageCopy link to color_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor color_image
direction_changeCopy link to direction_change
Type:integer · Direction Change
min:  
-180
max:  
180
nullable
How many degrees to rotate the subject

from_directionCopy link to from_direction
Type:string · Direction
enum
default: 
"south"
nullable
From subject direction

north
north-east
east
south-east
south
south-west
west
north-west
from_viewCopy link to from_view
Type:string · CameraView
enum
default: 
"side"
nullable
From camera view angle

side
low top-down
high top-down
image_guidance_scaleCopy link to image_guidance_scale
Type:number · Image Guidance Scale
min:  
1
max:  
20
default: 
3
How closely to follow the reference image

init_imageCopy link to init_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor init_image
init_image_strengthCopy link to init_image_strength
Type:integer · Init Image Strength
min:  
1
max:  
999
default: 
300
Strength of the initial image influence

isometricCopy link to isometric
Type:boolean · Isometric
default: 
false
Generate in isometric view

mask_imageCopy link to mask_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor mask_image
oblique_projectionCopy link to oblique_projection
Type:boolean · Oblique Projection
default: 
false
Generate in oblique projection

Request model for image generation endpoint

Show additional propertiesfor Request Body
Responses

200
Successfully generated image
application/json
401Copy link to 401
Invalid API token

402Copy link to 402
Insufficient credits

422Copy link to 422
Validation error

429Copy link to 429
Too many requests

529Copy link to 529
Rate limit exceeded

Request Example forpost/rotate
Shell Curl
curl https://api.pixellab.ai/v1/rotate \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "description": "cute dragon",
  "from_direction": "south",
  "from_view": "side",
  "image_guidance_scale": 7.5,
  "image_size": {
    "height": 128,
    "width": 128
  },
  "to_direction": "east",
  "to_view": "side"
}'


Test Request
(post /rotate)
Status:200

{
  "image": {
    "type": "base64",
    "base64": "data:image/png;base64,..."
  },
  "usage": {
    "type": "credits",
    "credits": 1
  }
}

Successfully generated image

Inpaint ​Copy link
InpaintOperations
post
/inpaint
Inpaint image​Copy link
Creates a pixel art image based on the provided parameters. Called "Inpaint" in the plugin.

Supported image size:

Maximum area 200x200
Supported features:

Inpainting
Init image
Forced palette
Transparent background
Using the Python client:

import pixellab

client = pixellab.Client(secret="YOUR_API_TOKEN")

response = client.inpaint(
    description="boy with wings",
    image_size=dict(width=16, height=16),
    inpainting_image=image_of_boy_without_wings,
    mask_image=mask_image,
)
response.image.pil_image()
Body
required
application/json
Request model for image generation endpoint

descriptionCopy link to description
Type:string · Description
required
Text description of the image to generate

image_sizeCopy link to image_size
Type:object · app__endpoints__external__v1__generate_inpainting__ImageSize
required
Example
Show ImageSizefor image_size
inpainting_imageCopy link to inpainting_image
Type:object · Base64Image
required
Reference image which is inpainted

Show Base64Imagefor inpainting_image
mask_imageCopy link to mask_image
Type:object · Base64Image
required
Inpainting / mask image. (black and white image, where the white is where the model should inpaint).

Show Base64Imagefor mask_image
color_imageCopy link to color_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor color_image
detailCopy link to detail
Type:string · Detail
enum
nullable
Detail style reference

low detail
medium detail
highly detailed
directionCopy link to direction
Type:string · Direction
enum
nullable
Subject direction

north
north-east
east
south-east
south
south-west
west
north-west
extra_guidance_scaleCopy link to extra_guidance_scale
Type:number · Extra Guidance Scale
min:  
0
max:  
20
default: 
3
(Deprecated)

init_imageCopy link to init_image
Type:object · Base64Image
nullable
A base64 encoded image.

Attributes: type (Literal["base64"]): Always "base64" to indicate the image encoding type base64 (str): The base64 encoded image data

Show Base64Imagefor init_image
init_image_strengthCopy link to init_image_strength
Type:integer · Init Image Strength
min:  
1
max:  
999
default: 
300
Strength of the initial image influence

isometricCopy link to isometric
Type:boolean · Isometric
default: 
false
Generate in isometric view

negative_descriptionCopy link to negative_description
Type:string · Negative Description
default: 
""
Text description of what to avoid in the generated image

Request model for image generation endpoint

Show additional propertiesfor Request Body
Responses

200
Successfully generated image
application/json
401Copy link to 401
Invalid API token

402Copy link to 402
Insufficient credits

422Copy link to 422
Validation error

429Copy link to 429
Too many requests

529Copy link to 529
Rate limit exceeded

Request Example forpost/inpaint
Shell Curl
curl https://api.pixellab.ai/v1/inpaint \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "description": "cute dragon",
  "image_size": {
    "height": 128,
    "width": 128
  },
  "no_background": true
}'


Test Request
(post /inpaint)
Status:200

{
  "image": {
    "type": "base64",
    "base64": "data:image/png;base64,..."
  },
  "usage": {
    "type": "credits",
    "credits": 1
  }
}

Successfully generated image

Account ​Copy link
AccountOperations
get
/balance
Get balance​Copy link
Returns the current balance for your account.

Using the Python client:

import pixellab

client = pixellab.Client(secret="YOUR_API_TOKEN")
balance = client.get_balance()
print(f"Current balance: {balance.usd} USD")
Responses

200
Successfully retrieved balance
application/json
401Copy link to 401
Invalid API token



Documentation
Community
API Documentation
AI Agent Toolkit

Ask AI...
Introduction
Introduction
Ways to use PixelLab
Installation (Aseprite)
Introduction to Pixelorama
FAQ
Guides
Init images and inpainting
Creating maps
Rotating a character
Create image
Create images from style references (Pro)
Create S-L image (Pro)
Create M-XL image (new)
Image to image (depth)
Create S-M image
Create S-M image (old)
Pose to image
Image to pixel art
Edit image
Edit image
Remove background
Resize
Unzoom pixel art
Rotate
Rotate
Animate
Animate with text (Pro)
Create animated object/character (Pro)
Animation to animation
Animate with skeleton
Edit animation (Pro)
Transfer outfit (Pro)
Re-pose
Animate with text (old)
Interpolate (old)
Create animations (automatic)
Map
Create map (pixflux)
Extend map (v2)
Extend map
Extend map (old)
Create texture
Create tileset
Create isometric tile
Inpaint
Inpaint
Inpaint v3
Inpaint M-L (pixpatch v2)
Reduce colors
Reduce colors
Experimental tools
Create walking character
Extra tools
Create S-M image (style)
Create S-M image (style, old)
Reshape
Create UI elements (Pro)
Tool options
General
Init image
Inpainting
Guidance
Character
Colors
Camera
Projection
docs

Introduction

Introduction
Welcome to the PixelLab Documentation. PixelLab offers multiple ways to generate and edit pixel art, including a simple web creator, an in-browser editor (PixelLab Pixelorama), an Aseprite extension, and API access. It is primarily aimed at artists and game developers.

While this documentation strives to be a comprehensive resource, guiding you through PixelLab's features, it is, much like our tool, a continuous work in progress. As our team develops new tools and enhances existing ones, there might be times when the documentation plays a bit of catch-up.

To get started, you can learn about the different ways to use PixelLab or explore some tool fundamentals with our getting started guide.

We appreciate your patience and feedback as we work to refine both our tools and this reference guide. Please reach out on Discord with any suggestions or inquiries.



Documentation
Community
API Documentation
AI Agent Toolkit

Ask AI...
Introduction
Introduction
Ways to use PixelLab
Installation (Aseprite)
Introduction to Pixelorama
FAQ
Guides
Init images and inpainting
Creating maps
Rotating a character
Create image
Create images from style references (Pro)
Create S-L image (Pro)
Create M-XL image (new)
Image to image (depth)
Create S-M image
Create S-M image (old)
Pose to image
Image to pixel art
Edit image
Edit image
Remove background
Resize
Unzoom pixel art
Rotate
Rotate
Animate
Animate with text (Pro)
Create animated object/character (Pro)
Animation to animation
Animate with skeleton
Edit animation (Pro)
Transfer outfit (Pro)
Re-pose
Animate with text (old)
Interpolate (old)
Create animations (automatic)
Map
Create map (pixflux)
Extend map (v2)
Extend map
Extend map (old)
Create texture
Create tileset
Create isometric tile
Inpaint
Inpaint
Inpaint v3
Inpaint M-L (pixpatch v2)
Reduce colors
Reduce colors
Experimental tools
Create walking character
Extra tools
Create S-M image (style)
Create S-M image (style, old)
Reshape
Create UI elements (Pro)
Tool options
General
Init image
Inpainting
Guidance
Character
Colors
Camera
Projection
docs

Ways to Use PixelLab

Ways to Use PixelLab
PixelLab offers several ways to access its image generation and editing tools, catering to different workflows and preferences. Whether you're experimenting on your phone, building a game with AI assistance, or integrating into your pro workflow, there's an option that fits.

Overview
Simple Web Creator — Quick, lightweight tool for fast generations. Works on desktop and mobile.
Characters (NEW) — Instant character creator for 4/8 directional animated sprites.
PixelLab Pixelorama (In-browser Editor) — Full-featured browser-based editor using the open-source Pixelorama.
Aseprite Extension — Bring PixelLab tools directly into your local Aseprite environment.
Vibe Coding (AI Agent Toolkit) — Give your AI coding assistant pixel art superpowers via MCP.
API Access — Use PixelLab's backend tools in your own app or pipeline.
Videos — demos and tutorials
1. Simple Web Creator
Our Simple Web Creator is the fastest way to generate images. Runs entirely in your browser and supports mobile devices.

Access: Visit the Create Page.
Features: Uses our "PixFlux" (for medium to extra-large images) and "BitForge" (for small to medium images) models.
Best for: Quick experiments, base image generation, or working on a mobile device.
Limitations: Streamlined interface with fewer features than the editor integrations.
2. Characters
Create game-ready characters with 4 or 8 directional views and custom animations — all from simple text descriptions.

Access: Visit the Characters Page.
Features:
Generate characters in 4 or 8 directions from text prompts
Add walk, run, idle, and other animations with one click
Export as sprite sheets or individual frames
Built-in animation preview
Best for: Game developers needing quick character assets, RPG makers, and anyone creating directional sprites.
Platform: Works on desktop and mobile browsers.
3. PixelLab Pixelorama (In-browser Editor)
Pixelorama is a free, open-source pixel art editor. We've integrated PixelLab directly into it for a full editing + AI generation experience — all in your browser.

Access: Open the In-browser Editor.
Features: Full Pixelorama toolset + PixelLab's AI generation tools.
Platform: Desktop browsers only.
Best for: Users wanting an advanced browser-based editor with full creation + generation features.
Limitations: No support for mobile browsers.
4. Aseprite Extension
Use PixelLab inside Aseprite, the professional-grade pixel art tool.

Access:
Download from your Account Page.
Follow the Installation Guide.
Features: Seamless AI-powered generation inside your Aseprite workflow.
Requirements: Aseprite v1.3+. Trial version does not support extensions.
Best for: Existing Aseprite users who want native integration.
Limitations: Requires Aseprite and local installation.
5. Vibe Coding (AI Agent Toolkit)
Enable AI-powered game development by giving your coding assistant direct access to PixelLab's generation tools through the Model Context Protocol (MCP).

Access: Visit the MCP Integration Page for setup instructions.
Features:
Generate characters, animations, tilesets, and isometric tiles from your IDE
Works with Claude Code, Cursor, VS Code, and other MCP-compatible AI assistants
Godot-specific tooling for headless game development
Complete asset-to-code workflow automation
Best for: Developers using AI assistants, rapid game prototyping, "vibe coding" workflows.
Requirements: MCP-compatible AI assistant and active subscription.
6. API Access
Use PixelLab in your own software, games, or pipelines through our API.

Access:
Directly via the API Docs.
For Python users, we offer a Python SDK to simplify integration.
Features: Programmatic access to image generation (PixFlux, BitForge), animation (skeleton, text), inpainting, rotation, and more
Best for: Automation, dynamic in-game asset creation, and custom tool development.
Limitations: Requires setup and coding knowledge.
7. Videos
Check out our YouTube channel for tutorials, demos, and behind-the-scenes looks at how to use PixelLab in various ways.


Ways to Use PixelLab


Documentation
Community
API Documentation
AI Agent Toolkit

Ask AI...
Introduction
Introduction
Ways to use PixelLab
Installation (Aseprite)
Introduction to Pixelorama
FAQ
Guides
Init images and inpainting
Creating maps
Rotating a character
Create image
Create images from style references (Pro)
Create S-L image (Pro)
Create M-XL image (new)
Image to image (depth)
Create S-M image
Create S-M image (old)
Pose to image
Image to pixel art
Edit image
Edit image
Remove background
Resize
Unzoom pixel art
Rotate
Rotate
Animate
Animate with text (Pro)
Create animated object/character (Pro)
Animation to animation
Animate with skeleton
Edit animation (Pro)
Transfer outfit (Pro)
Re-pose
Animate with text (old)
Interpolate (old)
Create animations (automatic)
Map
Create map (pixflux)
Extend map (v2)
Extend map
Extend map (old)
Create texture
Create tileset
Create isometric tile
Inpaint
Inpaint
Inpaint v3
Inpaint M-L (pixpatch v2)
Reduce colors
Reduce colors
Experimental tools
Create walking character
Extra tools
Create S-M image (style)
Create S-M image (style, old)
Reshape
Create UI elements (Pro)
Tool options
General
Init image
Inpainting
Guidance
Character
Colors
Camera
Projection
docs

Aseprite Extension Installation Instructions

Aseprite Extension Installation Instructions
Get Aseprite
Make sure you have the latest Aseprite (minimum version is v1.3.7). The trial version does not allow plugins.

Aseprite is open source, but it is not allowed to be redistributed. There are multiple ways to get it. You can, for example:

Buy it to support the developers
Use a helper to build it locally (Windows)
Build it with Docker (Linux)
Download the extension
After subscribing or signing up for the free trial, there will be a button to download the PixelLab extension from your account page.

Install the extension
You should be able to double click the downloaded file to install it. If you can't, you can also install it manually.

First, open Aseprite. From the menu bar, go to,

Edit > Preferences
Choose extensions in the list to the left, then click on "Add Extension" and locate the file that you downloaded in the first step.

The preferences window with the extensions tab selected
Allow file and internet access
After finishing the steps above restart Aseprite and you should be prompted to give the plugin access to a file called package.json and internet access via websockets.

The plugin requires access to these and if you want the auto-update function to work you also need to give the plugin "full trust" so that it can overwrite itself in the future.

File accessWebsocket access
Finish the installation
You should now see a new window, the PixelLab menu. If you don't see the window or if you accidentally closed it, you can open it from the menu bar,

Edit > PixelLab > Open plugin
or by pressing,

ctrl + space + p.

The PixelLab menu
Aseprite Extension Installation Instructions