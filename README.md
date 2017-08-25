# Drawbital
A simple collaborative drawing web app

## Using Drawbital
We're hosted at [bit.ly/drawbital](bit.ly/drawbital)

## Hosting Drawbital
### Prerequisites
1. [Node.js](https://nodejs.org/) (Tested with v6.11)
2. npm

### Steps
1. Clone the repo to your computer

	`> git clone https://github.com/shanwpf/drawbital.git`

2. Install node dependencies

	`> npm install`
	`> npm install gulp -g`
	
3. (Optional) Modify /src/app.js to use your own Firebase database

	```
	var config = {
		apiKey: YOUR_API_KEY,
    	authDomain: YOUR_AUTH_DOMAIN,
    	databaseURL: YOUR_DATABASE_URL,
    	projectId: YOUR_PROJECTID,
    	storageBucket: YOUR_STORAGE_BUCKET,
    	messagingSenderId: YOUR_SENDER_ID
	};
	```
	
4. Build with gulp

	`> gulp`
	
	This creates: 
	- /app.js (server)
	- /client/js/drawbital-compiled.js (client)
	
5. Start the server

	`> node app.js`
	
6. Connect to your server

	[localhost:2000](http://localhost:2000)
	
	The default port is 2000. To change it, edit
	
	`server.listen(process.env.PORT || 2000);`
	
	to
	
	`server.listen(process.env.PORT || <YOUR_PORT_HERE>);`
	
	in /src/app.js and rebuild.
