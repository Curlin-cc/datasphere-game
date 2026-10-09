# 11. Transport und Lifecycle-Management

## 11.1 Zweck und Einordnung

Mit dem Transport- und Lifecycle-Management werden Modellierungsinhalte
kontrolliert zwischen SAP-Datasphere-Mandanten (*Tenants*) übertragen,
zum Beispiel von der Entwicklung über den Test in die Produktion. Laut
SAP-Dokumentation („Transporting Content Between Tenants") ist der
einfachste Weg für den Export der Editor *Transport \> Export*. Dort
werden Objekte einem Paket (*Package*) zugeordnet. Anschließend legt man
fest, welche Mandanten auf das Paket zugreifen dürfen, und exportiert es
in einen privaten Cloud-Speicher (*private cloud storage*), aus dem es
später importiert werden kann.

Zum Lifecycle-Management gehören außerdem Werkzeuge, die nicht in der
Transport-App liegen:

-   der Repository Explorer (*Repository Explorer*) für den Zugriff auf
    alle Objekte,

-   die Versionshistorie mit Wiederherstellung,

-   die Befehlszeilenschnittstelle (*Command Line Interface*, CLI) für
    automatisierte Abläufe.

Die Modellierung der transportierten Objekte wird in Kapitel 6 (Data
Builder) und Kapitel 7 (Business Builder) beschrieben. Rollen und
Berechtigungen werden in Kapitel 3 behandelt, das Bereichskonzept in
Kapitel 4.

## 11.2 Aufruf und Navigation

-   **Transport-App:** Die App wird über den Eintrag Transport
    (*Transport*) in der Seitenleiste aufgerufen (zur Seitenleiste siehe
    Kapitel 2). Laut Dokumentation gibt es die Bereiche Export
    (*Export*) und Import (*Import*). Ob es in der aktuellen Oberfläche
    weitere Unterpunkte gibt, ist nicht verifiziert.

-   **Berechtigung:** Pakete anlegen und exportieren dürfen laut
    SAP-Dokumentation Benutzer mit Bereichsadministrator-Privilegien
    (*space administrator privileges*). Ein Community-Beitrag nennt für
    Export und Import die Rollen Administrator oder
    Bereichsadministrator mit Lese-, Pflege- und Freigaberechten für
    Lifecycle-Daten. Die genaue Privilegbezeichnung in der offiziellen
    Privilegienliste ist nicht verifiziert.

-   **Modellierer:** Sie brauchen keinen Zugriff auf die Transport-App.
    Sie ordnen Objekte direkt in ihren Editoren einem Paket zu (siehe
    11.4.1).

-   **Repository Explorer und Versionen:** Beide sind Teil der
    Modellierungsumgebung (siehe 11.4.8 und 11.4.9).

## 11.3 Aufbau der Oberfläche

Die Dokumentation beschreibt den Exporteditor als Arbeitsbereich mit
folgenden Funktionen:

-   Objekte zum Paket hinzufügen,

-   berechtigte Zielmandanten festlegen,

-   das Paket exportieren.

Laut Community-Beitrag sind außerdem folgende Elemente vorhanden:

-   **Benachrichtigungen (\*Notifications\*):** zeigen den Fortschritt
    eines Exports.

-   **Exportzusammenfassung (\*Export Summary\*):** zeigt den Status
    aller Objekte im Paket.

-   **Abschnitt Meine Inhalte (\*My Content\*):** Hier wird das Paket
    nach erfolgreichem Export für die berechtigten Mandanten sichtbar.

Die Bezeichnungen aus dem Community-Beitrag sind nicht durch
help.sap.com belegt. SAP ändert die Oberfläche regelmäßig. Exakte
Schaltflächentexte, Spalten und Registerkarten sollten daher vor
Freigabe am System geprüft werden.

## 11.4 Funktionen

### 11.4.1 Pakete anlegen

Ein Paket bündelt zusammengehörige Objekte für den Transport zwischen
Mandanten. So beschreibt es die SAP-Seite „Creating Packages to Export".
Der Ablauf hat drei Rollen:

210. Der Bereichsadministrator legt das Paket an.

211. Sobald in einem Bereich ein Paket existiert, erscheint in den
     Editoren das Feld Paket (*Package*). Darüber ordnen Modellierer
     ihre Objekte dem Paket zu.

212. Ist das Paket vollständig und validiert, exportiert der
     Bereichsadministrator es in das Content Network (*Content
     Network*).

Verwaltung von Paketen:

-   **Pflichtangaben und Versionierung:** Welche Felder ein Paket
    zwingend braucht und wie Pakete versioniert werden, ist nicht
    verifiziert.

-   **Mehrere Bereiche:** Ob ein Paket Objekte aus mehreren Bereichen
    enthalten darf, ist ebenfalls nicht verifiziert.

### 11.4.2 Abhängigkeiten und erforderliche Pakete

Die SAP-Seite zur CLI-Paketverwaltung nennt erforderliche Pakete
(*required packages*). Ein Paket kann also auf andere Pakete verweisen,
deren Objekte es benötigt. Das gilt zum Beispiel für Ansichten
(*Views*), die auf Tabellen aus einem Basispaket aufbauen.

Für die Praxis heißt das: Ein Paket sollte erst exportiert werden, wenn
es validiert ist und alle benötigten Pakete im Zielmandanten vorhanden
sind oder gemeinsam importiert werden. Wie die Validierung im Einzelnen
funktioniert, etwa Warnungen bei fehlenden abhängigen Objekten, ist
nicht verifiziert.

### 11.4.3 Export

Beim Export wird das Paket in den privaten Cloud-Speicher bzw. das
Content Network geschrieben. Dabei werden die Mandanten festgelegt, die
das Paket importieren dürfen. Fortschritt und Ergebnis lassen sich über
die Benachrichtigungen und die Exportzusammenfassung verfolgen
(Community-Beitrag, siehe 11.3).

### 11.4.4 Import

Im Zielmandanten wählt der Administrator bzw. Bereichsadministrator ein
freigegebenes Paket aus dem Content Network und importiert es. Zwei
SAP-Hinweise beschreiben wichtige Grenzen:

-   **Überschreiben von Objekten und Daten:** Beim Import gibt es die
    Option, Objekte und Daten zu überschreiben (*overwrite objects and
    data*, Formulierung laut SAP-Hinweis 3609213). Ist sie gewählt,
    werden auch die Zeitplaneinstellungen (*Schedules*) im Zielmandanten
    überschrieben.

-   **Änderung der Deltaerfassung:** Die Eigenschaft Deltaerfassung
    (*Delta Capture*) einer lokalen Tabelle lässt sich nach der
    Bereitstellung (*Deployment*) nicht mehr ändern. Ein Import, der
    eine bestehende Tabelle mit abweichender Einstellung überschreiben
    soll, schlägt deshalb fehl (SAP-Hinweis 3700359).

Weitere Importoptionen sind nicht verifiziert. Dazu gehören die
Bereitstellung nach dem Import und die Zuordnung zu einem anderen
Bereich.

### 11.4.5 Content Network und Business Content

Über das Content Network werden auch Inhalte bereitgestellt, die SAP
oder Partner veröffentlicht haben. Laut SAP-Dokumentation können
Administratoren und Bereichsadministratoren Business Content und
Beispielinhalte über die App Semantisches Onboarding (*Semantic
Onboarding*) importieren. Diese Inhalte werden in Kapitel 8 nicht erneut
behandelt. Hier geht es um den Transportweg, nicht um den Katalog.

### 11.4.6 Integration mit SAP Cloud Transport Management ⚠ abhängig von Lizenz/Freischaltung

SAP Datasphere lässt sich mit dem SAP Cloud Transport Management Service
auf der SAP Business Technology Platform (BTP) verbinden. Darüber werden
Inhaltspakete über Systemlandschaften hinweg transportiert. Der Ablauf
hat zwei Teile:

213. Das Cloud-Transport-Management-System konfigurieren: Landschaft,
     Transportknoten und Transportrouten.

214. Das konfigurierte System mit dem SAP-Datasphere-Mandanten
     verbinden.

Für diese Integration ist ein BTP-Subaccount mit dem entsprechenden
Service nötig.

Welche Vorteile die Integration gegenüber dem reinen
Content-Network-Transport bietet, etwa Genehmigungen und
Importwarteschlangen, wird nur in Community-Beiträgen genannt. Diese
Angaben sind nicht durch help.sap.com verifiziert.

### 11.4.7 Object Store -- Abgrenzung ⚠ abhängig von Lizenz/Freischaltung

Im Kontext von SAP Business Data Cloud ist der Object Store ein
dateibasierter Speicher auf Basis von SAP HANA Cloud, Data Lake Files.
Er wird über eigene Dateibereiche genutzt (siehe Kapitel 4 und 6).

Folgende Punkte sind nicht verifiziert:

-   ob und wie Objekte aus Dateibereichen über die Transport-App
    transportiert werden,

-   ob der private Cloud-Speicher des Exports technisch mit diesem
    Object Store zusammenhängt.

### 11.4.8 Repository Explorer

Der Repository Explorer gibt laut SAP-Dokumentation Zugriff auf alle
SAP-Datasphere-Objekte. Folgende Funktionen sind dort belegt:

-   die Objektliste durchsuchen und filtern,

-   bestehende Objekte öffnen oder Aktionen darauf ausführen,

-   neue Objekte anlegen.

Im Lifecycle-Kontext dient er dazu, vor dem Paketieren einen Überblick
über den Objektbestand zu bekommen. Welche Aktionen im Einzelnen
verfügbar sind, zum Beispiel Massenzuordnung zu Paketen, ist nicht
verifiziert.

### 11.4.9 Versionen und Wiederherstellung

Jede Bereitstellung eines Objekts erzeugt eine neue Version im
Repository. Frühere Versionen lassen sich jederzeit ansehen, und eine
frühere Version kann wiederhergestellt werden (SAP-Seite „Reviewing and
Restoring Object Versions"). Die Versionshistorie wirkt nur innerhalb
eines Mandanten. Sie ersetzt keinen mandantenübergreifenden Transport.

Nicht verifiziert ist, ob eine wiederhergestellte Version erneut
bereitgestellt werden muss. Ebenso ist nicht belegt, wie viele Versionen
aufbewahrt werden.

### 11.4.10 Command Line Interface und APIs für CI/CD

-   **Installation und Umbenennung:** Die CLI wird als npm-Paket
    \@sap/datasphere-cli installiert. Das Modul hieß früher dwc. Der
    Befehl dwc wurde Ende 2023 abgeschaltet; seitdem gilt datasphere.

-   **Initialisierung:** Bei der Initialisierung lädt die CLI vom
    Mandanten ein Servicedokument herunter. Es beschreibt, welche
    Befehle der Mandant versteht. Der verfügbare Befehlsumfang hängt
    deshalb vom Release des Mandanten ab.

-   **Paketverwaltung:** Laut „Managing Packages via the Command Line"
    lassen sich über die CLI erforderliche Pakete und Objekte einem
    Paket hinzufügen und das Paket in das Content Network exportieren.

Mit diesen Befehlen lassen sich Transporte in CI/CD-Pipelines einbinden.
Programmierschnittstellen für Datenzugriff und -verbrauch werden in
Kapitel 12 beschrieben.

Folgende Angaben sind nicht verifiziert:

-   die genaue Befehlssyntax,

-   ob der Import ebenfalls per CLI möglich ist,

-   welche REST-APIs es speziell für Transporte gibt.

## 11.5 Typische Abläufe

**Ablauf A -- Transport über das Content Network**

215. Der Bereichsadministrator legt im Quellmandanten ein Paket an.

216. Modellierer ordnen ihre Objekte über das Feld Paket (*Package*) in
     den Editoren zu.

217. Der Bereichsadministrator prüft, ob alle benötigten Pakete
     eingetragen sind, und validiert das Paket.

218. Der Bereichsadministrator legt die Zielmandanten fest und
     exportiert das Paket.

219. Fortschritt und Ergebnis werden über die Benachrichtigungen und die
     Exportzusammenfassung geprüft.

220. Im Zielmandanten wird das Paket ausgewählt und importiert. Die
     Option zum Überschreiben von Objekten und Daten wird bewusst
     gesetzt oder nicht gesetzt (siehe 11.4.4).

221. Die importierten Objekte werden geprüft. Zeitpläne und Verbindungen
     werden bei Bedarf angepasst (Verbindungen siehe Kapitel 5).

**Ablauf B -- Transport über SAP Cloud Transport Management ⚠**

222. Im BTP-Subaccount wird SAP Cloud Transport Management mit
     Landschaft und Transportrouten konfiguriert, zum Beispiel
     Entwicklung → Test → Produktion.

223. Das System wird mit den SAP-Datasphere-Mandanten verbunden.

224. Pakete werden wie in Ablauf A angelegt und exportiert. Die
     Weiterleitung entlang der Route übernimmt der Service. Die genaue
     Bedienung in SAP Datasphere ist nicht verifiziert.

**Ablauf C -- Frühere Objektversion wiederherstellen**

225. Das Objekt im Editor öffnen.

226. Die Versionshistorie aufrufen und die Versionen vergleichen.

227. Die gewünschte Version wiederherstellen und, falls nötig, erneut
     bereitstellen (nicht verifiziert, siehe 11.4.9).

**Ablauf D -- Automatisierung per CLI**

228. \@sap/datasphere-cli installieren.

229. Die CLI gegen den Mandanten initialisieren und das Servicedokument
     laden.

230. Per Befehl erforderliche Pakete und Objekte dem Paket hinzufügen.

231. Das Paket per Befehl in das Content Network exportieren.

232. Den Ablauf in eine CI/CD-Pipeline einbinden.

## 11.6 Abhängigkeiten, Grenzen und Hinweise

-   **Abhängigkeiten zuerst:** Pakete mit erforderlichen Paketen sollten
    erst transportiert werden, wenn die Basispakete im Ziel vorhanden
    sind.

-   **Überschreiben:** Ein Import mit Überschreiben ändert auch die
    Zeitpläne im Ziel (SAP-Hinweis 3609213).

-   **Unveränderliche Eigenschaften:** Die Deltaerfassung
    bereitgestellter lokaler Tabellen kann nicht per Import geändert
    werden (SAP-Hinweis 3700359).

-   **Mandantenspezifische Einstellungen:** Ob Verbindungen,
    Bereichseinstellungen, Benutzer und Rollen mit transportiert werden,
    ist nicht verifiziert. Sie sollten im Zielmandanten getrennt
    gepflegt werden (siehe Kapitel 3, 4 und 5).

-   **Daten und Metadaten:** Wie weit Daten über die Überschreiboption
    hinaus mit transportiert werden, ist nicht verifiziert.

-   **Release-Unterschiede:** Ob Pakete zwischen Mandanten mit
    unterschiedlichem Releasestand transportiert werden können, ist
    nicht verifiziert. Da der CLI-Befehlsumfang aus dem Servicedokument
    des Mandanten stammt, sind Unterschiede zwischen Mandanten möglich.

## 11.7 Empfehlungen für das mandantenübergreifende Lifecycle-Management

Die folgenden Empfehlungen sind aus den belegten Funktionen abgeleitet.
Eine offizielle SAP-Best-Practice-Quelle dafür ist nicht verifiziert.

233. Mindestens eine Landschaft aus Entwicklung, Test und Produktion
     einrichten. In der Produktion möglichst nicht modellieren.

234. Bereichsnamen in allen Mandanten einheitlich halten, damit
     importierte Objekte ihrem Bereich eindeutig zugeordnet werden
     (nicht verifiziert, ob das technisch vorausgesetzt wird).

235. Paketschnitt fachlich und nach Schichten planen, zum Beispiel ein
     Basispaket für Tabellen und Folgepakete für Ansichten und Modelle.
     Abhängigkeiten als erforderliche Pakete pflegen.

236. Die Überschreiboption beim Import nur nach Prüfung der Folgen für
     Zeitpläne und Daten verwenden.

237. Für Freigaben und Nachvollziehbarkeit SAP Cloud Transport
     Management prüfen ⚠.

238. Wiederkehrende Exporte per CLI automatisieren und mit
     CI/CD-Pipelines verbinden.

239. Die Versionshistorie innerhalb eines Mandanten zur
     Wiederherstellung nutzen, nicht als Ersatz für Transporte.

## 11.8 Übersicht: Funktion -- Zweck -- benötigtes Privileg

  -----------------------------------------------------------------------------------
  **Funktion**            **Zweck**               **Benötigtes Privileg / Rolle**
  ----------------------- ----------------------- -----------------------------------
  Paket anlegen           Zusammengehörige        Bereichsadministrator-Privilegien
                          Objekte für den         
                          Transport bündeln       

  Objekt einem Paket      Objekt über das Feld    Modellierungsrechte im Bereich
  zuordnen                Paket (*Package*) in    (genaues Privileg nicht
                          den                     verifiziert)
                          Editor-Eigenschaften    
                          zuordnen                

  Export                  Paket in Cloud-Speicher Bereichsadministrator; laut
                          bzw. Content Network    Community auch Administrator
                          schreiben,              
                          Zielmandanten festlegen 

  Import                  Freigegebenes Paket im  Administrator oder
                          Zielmandanten           Bereichsadministrator
                          einspielen              (Community-Angabe, nicht offiziell
                                                  verifiziert)

  Business Content        SAP-/Partnerinhalte     Administrator oder
  importieren             über das Semantische    Bereichsadministrator
                          Onboarding (*Semantic   
                          Onboarding*) übernehmen 

  SAP Cloud Transport     Transporte entlang      Mandantenadministrator und
  Management ⚠            definierter             BTP-Rechte (nicht verifiziert)
                          Landschaftsrouten       

  Repository Explorer     Alle Objekte suchen,    Lesezugriff auf den Bereich (nicht
                          filtern, öffnen,        verifiziert)
                          anlegen                 

  Versionen ansehen und   Frühere bereitgestellte Modellierungsrechte (nicht
  wiederherstellen        Version                 verifiziert)
                          wiederherstellen        

  CLI-Paketverwaltung     Pakete per Skript       Gleiche Rechte wie in der
                          befüllen und            Oberfläche (nicht verifiziert)
                          exportieren             
  -----------------------------------------------------------------------------------
