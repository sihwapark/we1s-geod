# WE1S GeoD



## How to Use

### 0. Downloading the Code

In a terminal window:

```
git clone https://github.com/sihwapark/we1s-geod.git
```

Or download a ZIP file from https://github.com/sihwapark/we1s-geod/archive/master.zip and unzip it.

### 1. Installing Node.js

By using a pre-built installer:

* https://nodejs.org/en/download/

(macOS) By using `homebrew` in Terminal:

```
brew install node
```

### 2. Installing Dependencies

Move into the root folder of the we1s-geod code, open a terminal window and enter the below command.

```
npm install
```



### 3. Putting Google Map API Key

In the root folder of the we1s-geod code, create and open `.env` file in a text editor. And write below environment variabels and save the file.

```
#Set your Google Maps API Key
GOOGLE_MAPS_API_KEY=YOUR_API_KEY

#Set a port number you will use in a browser
PORT=5000
```

### 3. Running Server

```
node app.js
```

Or

```
npm start
```

### 4. Openning Application

Open a browser and enter http://localhost:5000/.