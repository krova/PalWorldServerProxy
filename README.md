# PalWorldServerProxy
UDP Proxy for PalWorld Server that suspends the process when no one is connected.

Simple, no-dependency, Windows instructions:
* Download and unzip `PalWorldServerProxy.zip` from [Releases](https://github.com/krova/PalWorldServerProxy/releases) (includes a Windows binary of Node.js)
* By default, PalWorldServerProxy will listen on port 8211 (so your players dont have to change anything) and forward to port 8212, so edit your PalWorld server's settings to listen on 8212.
  * Alternatively, edit `index.js` (in Notepad or your favorite text editor) and change the ports as needed.
* Start your PalWorld server
  * Alternatively, edit `index.js` (in Notepad or your favorite text editor) and define your PalWorld server path in PAL_EXEC.
* Run `run.cmd`

Running from source:
* Install Node.js
* Run `npm i` to install dependencies
* Run `node .` in the repo folder

Notes:
* Make sure to connect to the proxyied port, or the proxy will put the server to sleep while you're playing!
* Moving the actual PalWorld server to a non-standard port (8211) helps avoid any accidental direct connection.
  
Additional options of note in `index.js`:
* ***IDLE_TIME*** Defaults to 30 seconds, adjust as desired. Server will fall asleep after the specified time.

Contact
* `krova666` on Discord

License
* PalWorldServerProxy is released under the MIT License
* Binary dependencies (Node.js and Microsoft's PsUtils) have their own licenses
