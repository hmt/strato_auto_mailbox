# Strato Postfächer automatisiert erstellen

Dieses Script erstellt automatisch Postfächer für die Strato-Webangebote.

Zum Einrichten die `config.json` mit dem Nutzerzugang und dem Passwort ausstatten.
Anschließend eine users.csv im Startverzeichnis erstellen nach dem Schema:

```
"Vorname und Name",alias,vorname.name@andere_adresse.de
```

Warum? Ich brauchte das in diesem Format.

Anschließend das Script vorbereiten und starten:

```
npm i
npm run build
npm run dist
```

Neue Nutzer können in der `users.csv` hinzugefügt werden. Weitere Durchläufe ergänzen nur die neuen Benutzer.

Eine Liste der bisher erstellten Benutzer wird mit neuer Adresse und alter Adresse in `existing.json` gespeichert.

Lizenziert mit der MIT-Lizenz