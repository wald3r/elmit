
kill -9 $(lsof -t -i:3001)
npm start > logfile.txt &