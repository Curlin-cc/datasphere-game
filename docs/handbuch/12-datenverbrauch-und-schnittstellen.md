# 12. Datenverbrauch und Schnittstellen

## 12.1 Zweck und Einordnung

SAP Datasphere modelliert Daten nicht nur, sondern stellt sie auch für
nachgelagerte Werkzeuge bereit. Diese Bereitstellung heißt in der
Dokumentation „Datenverbrauch" (*Consuming Data Exposed by SAP
Datasphere*). Dafür gibt es vier Wege:

240. **Live-Zugriff aus SAP-Analysewerkzeugen**: SAP Analytics Cloud und
     das Microsoft-Excel-Add-in von SAP Analytics Cloud.

241. **SQL-Zugriff** über einen Datenbankbenutzer (*Database User*) bzw.
     ein Open-SQL-Schema (*Open SQL Schema*) per ODBC/JDBC, z. B. für
     Microsoft Power BI.

242. **REST-Zugriff** über die OData-API (*OData API*) mit
     OAuth-Authentifizierung.

243. **Physische Weitergabe** über Replikationsflüsse (*Replication
     Flows*) an Ziele außerhalb von SAP (Premium Outbound Integration)
     und über den Austausch von Datenprodukten mit SAP Databricks
     innerhalb von SAP Business Data Cloud.

Wie Views, analytische Modelle und Replikationsflüsse modelliert werden,
steht in Kapitel 6. Datenprodukte und Katalog behandelt Kapitel 8,
Datenzugriffskontrollen Kapitel 9. Dieses Kapitel beschreibt nur die
Schnittstellen nach außen.

## 12.2 Aufruf und Navigation

Für die Datenbereitstellung gibt es in der Seitenleiste keinen eigenen
Bereich. Die Einstellungen liegen an mehreren Stellen:

-   **Freigabe einzelner Objekte**: im jeweiligen Editor des
    Datenbausteins (*Data Builder*, Kapitel 6), über die Eigenschaft
    *Expose for Consumption*. Den genauen Schaltertext und die Position
    im Eigenschaftsbereich konnte ich an einer help.sap.com-Seite nicht
    verifizieren.

-   **Datenbankbenutzer und Open-SQL-Schemas**: in der
    Bereichsverwaltung (*Space Management*, Kapitel 4). Diese Benutzer
    legen Bereichsadministratoren an.

-   **OAuth-Clients für die OData-API**: in der Systemkonfiguration
    (Kapitel 3). Die genaue Registerkarte ist nicht verifiziert.

-   **Kapazität für Premium Outbound Integration**: in der
    Mandantenkonfiguration (*Tenant Configuration*, Kapitel 3). ⚠
    abhängig von Lizenz/Freischaltung

-   **Verbindungen in SAP Analytics Cloud**: Diese Verbindungen werden
    nicht in Datasphere, sondern in SAP Analytics Cloud angelegt.

## 12.3 Freigabe für den Verbrauch (Expose for Consumption)

Externe Werkzeuge sehen nur Objekte, die für den Verbrauch freigegeben
sind. Laut SAP-Dokumentation können Werkzeuge über ein Open-SQL-Schema
„Perspektiven und Views, die für den Verbrauch freigegeben sind" lesen.
Für die OData-API heißt es, sie liefere „als Views oder analytische
Modelle freigegebene Daten".

Wichtige Hinweise:

-   Die Freigabe gilt für das einzelne Objekt und muss im Editor gesetzt
    und anschließend bereitgestellt (*deploy*) werden.

-   Ob analytische Modelle (*Analytic Model*) automatisch freigegeben
    sind, habe ich nicht verifiziert.

-   Datenzugriffskontrollen (*Data Access Controls*) wirken auch beim
    Verbrauch (Kapitel 9). Die Einzelheiten je Schnittstelle sind nicht
    verifiziert.

## 12.4 Konsumierung in SAP Analytics Cloud

### 12.4.1 Live-Verbindung

In SAP Analytics Cloud lassen sich Live-Datenverbindungen (*Live Data
Connections*) zu SAP-Datasphere-Systemen anlegen. Darüber sind diese
Objekte zugänglich:

-   analytische Datensätze (*Analytical Dataset*),

-   analytische Modelle (*Analytic Model*),

-   Perspektiven (*Perspective*).

Die Daten verbleiben in Datasphere und werden bei jeder Abfrage live
gelesen.

**Typischer Ablauf** (Menüpfade in SAP Analytics Cloud nicht
verifiziert):

244. Analytisches Modell im Datenbaustein erstellen und bereitstellen
     (Kapitel 6).

245. In SAP Analytics Cloud eine Live-Datenverbindung vom Typ SAP
     Datasphere anlegen.

246. Beim Anlegen einer Story bzw. eines Modells diese Verbindung wählen
     und das analytische Modell oder die Perspektive auswählen.

### 12.4.2 Importverbindung über die OData-API

Alternativ kann man in SAP Analytics Cloud eine Importverbindung
(*import data connection*) anlegen. Sie liest Daten über die OData-API
und speichert sie in einem SAP-Analytics-Cloud-Modell. Im Unterschied
zur Live-Verbindung werden die Daten kopiert und müssen über geplante
Ladeläufe aktualisiert werden.

### 12.4.3 Empfehlung zur Semantik

Die Dokumentation zum Excel-Add-in empfiehlt, analytische Datensätze auf
die neue semantische Verwendung *Fact* umzustellen und View-Daten über
analytische Modelle bereitzustellen. Das deutet darauf hin, dass das
analytische Modell der bevorzugte Weg für den Verbrauch ist.

## 12.5 Microsoft-Excel-Add-in ⚠ abhängig von Lizenz/Freischaltung

Daten aus Datasphere lassen sich über das Add-in „SAP Analytics Cloud,
add-in for Microsoft Excel" in Excel nutzen. Voraussetzung ist eine
Live-Verbindung von SAP Analytics Cloud zu SAP Datasphere. Verfügbar
sind analytische Modelle und Perspektiven.

-   **Ergebnisgrenze**: Das Add-in nutzt den Standardwert der SAP HANA
    Multi-Dimensional Services (MDS) von 1 000 000 Ergebnissätzen.

-   **SAP Analysis for Microsoft Office**: Laut SAP-KBA 3297935
    unterstützt dieses Werkzeug als Datasphere-Quelle nur Views mit der
    semantischen Verwendung *Analytical Dataset*, aber keine
    analytischen Modelle. Das ist nicht an help.sap.com verifiziert.

-   **Lizenz**: Die Nutzung setzt einen SAP-Analytics-Cloud-Mandanten
    voraus. Die genauen Lizenzbedingungen sind nicht verifiziert.

## 12.6 Fremd-BI über Datenbankbenutzer und Open-SQL-Schema (ODBC/JDBC)

### 12.6.1 Funktion

Bereichsadministratoren können Datenbankbenutzer anlegen. Diese Benutzer
können:

-   die vom Bereich freigegebenen Daten lesen,

-   Daten in Open-SQL-Schemas schreiben, die dem Bereich zugeordnet
    sind.

Der Zugriff läuft per ODBC auf die SAP-HANA-Cloud-Laufzeitdatenbank.
Clients, Werkzeuge und Anwendungen, ausdrücklich auch Microsoft Power
BI, lesen darüber freigegebene Perspektiven und Views per ODBC/JDBC.

### 12.6.2 Wichtigste Optionen

Die Berechtigungen des Datenbankbenutzers stellt man im Dialog *Edit
Privileges* ein (Dialogtext laut SAP-KBA 3428316, nicht an help.sap.com
verifiziert):

-   Lesezugriff auf die freigegebenen Objekte des Bereichs,

-   Schreibzugriff über die Option *Enable Write Access (SQL, DDL,
    DML)*: Externe Werkzeuge können dann im eigenen Open-SQL-Schema
    Objekte anlegen und Daten schreiben.

Wie man Datenbankbenutzer in der Bereichsverwaltung anlegt, beschreibt
Kapitel 4.

### 12.6.3 Typischer Ablauf

247. Benötigte Views bzw. Perspektiven für den Verbrauch freigeben
     (Abschnitt 12.3).

248. Als Bereichsadministrator in der Bereichsverwaltung einen
     Datenbankbenutzer mit Lesezugriff anlegen (Kapitel 4).

249. Hostname, Port, Benutzername und Kennwort aus den Benutzerdetails
     übernehmen.

250. Die IP-Adresse des Clients in die Positivliste aufnehmen. Diese
     Voraussetzung ist nicht verifiziert (Kapitel 3).

251. Im BI-Werkzeug eine ODBC- oder JDBC-Verbindung zu SAP HANA anlegen
     und die freigegebenen Objekte auswählen.

## 12.7 OData Consumption API

### 12.7.1 Funktion

Über die OData-API lesen SAP Analytics Cloud und andere OData-fähige
Clients, Werkzeuge und Anwendungen die freigegebenen Views und
analytischen Modelle. Die Authentifizierung läuft über einen
OAuth-Client.

### 12.7.2 Relationale und analytische Variante

Die API hat eine relationale Variante (zeilenbasierter Zugriff auf
Views) und eine analytische Variante (aggregierter Zugriff auf
analytische Modelle). Beide Varianten sind in der SAP Community
beschrieben. URL-Struktur, unterstützte OData-Optionen und Seitengrößen
konnte ich an help.sap.com nicht verifizieren.

### 12.7.3 Authentifizierung

Laut SAP-KBA 3563695 braucht man in Datasphere einen OAuth-2.0-Client
mit dem Verwendungszweck *Interactive Usage*, weil die Verbindung einen
gültigen SAML-basierten Benutzerkontext benötigt. Dabei wird der
OAuth-Ablauf *authorization_code* verwendet. Ob ein technischer Zugriff
ohne Benutzerkontext unterstützt wird, ist nicht verifiziert.

### 12.7.4 Typischer Ablauf

252. Objekt für den Verbrauch freigeben (Abschnitt 12.3).

253. Als Administrator einen OAuth-Client mit dem Zweck *Interactive
     Usage* anlegen. Redirect-URI des Clients eintragen (Kapitel 3).

254. Client-ID und Secret sowie Autorisierungs- und Token-URL an den
     Entwickler des Clients übergeben.

255. Im Client das Token über den Ablauf *authorization_code* holen und
     die Service-URL des Objekts aufrufen.

## 12.8 Outbound über Replikationsflüsse (Premium Outbound Integration) ⚠ abhängig von Lizenz/Freischaltung

### 12.8.1 Funktion

Für einen Replikationsfluss mit einem Ziel außerhalb von SAP braucht man
die Premium Outbound Integration. Ohne diese Funktion kann ein solcher
Replikationsfluss nicht gestartet werden. Den Replikationsfluss selbst
modelliert man im Datenbaustein (Kapitel 6).

Laut Praxisbeiträgen kommen als Ziele unter anderem in Frage:

-   Google BigQuery,

-   Apache Kafka,

-   Microsoft Azure Data Lake Storage Gen2,

-   Amazon S3,

-   Google Cloud Storage.

Die vollständige, aktuelle Zielliste ist nicht an help.sap.com
verifiziert.

### 12.8.2 Kapazität und Abrechnung

-   **Freischaltung**: Ein Ziel außerhalb von SAP funktioniert nur, wenn
    in der Mandantenkonfiguration Blöcke (*blocks*) für Premium Outbound
    Integration zugewiesen sind (Kapitel 3).

-   **Fehler bei aufgebrauchtem Volumen**: Ist das monatliche
    Outbound-Volumen verbraucht, startet der Lauf nicht. Die
    Fehlermeldung verweist darauf, dass ein Administrator die
    Premium-Outbound-Blöcke erhöhen kann (Wortlaut laut SAP-KBA
    3456481).

-   **Überwachung**: Die Überwachung zeigt das Gesamtvolumen aller
    Replikationsflussläufe mit Premium Outbound Integration der letzten
    360 Tage (Kapitel 10).

### 12.8.3 Hinweise

Nicht alle Datentypen werden von jedem Ziel unterstützt. Laut einem
Community-Beitrag unterstützt Google BigQuery zum Beispiel DECFLOAT16,
DECFLOAT34 und UINT64 nicht. Das ist nicht an help.sap.com verifiziert.

## 12.9 Integration mit SAP Databricks und SAP Business Data Cloud ⚠ abhängig von Lizenz/Freischaltung

Im Rahmen von SAP Business Data Cloud gibt es zwei Richtungen für den
Austausch von Datenprodukten (Kapitel 8):

-   **Von BDC nach SAP Databricks**: Datenprodukte aus dem Katalog von
    SAP Business Data Cloud werden für SAP Databricks freigegeben.
    Alternativ legt man in SAP Databricks aus dem zugehörigen Delta
    Share einen Katalog an.

-   **Von SAP Databricks nach BDC**: Datenprodukte aus SAP Databricks
    werden mit einem Python-SDK in SAP Business Data Cloud
    veröffentlicht. Danach finden andere Anwendungen sie, z. B. SAP
    Datasphere.

SAP-Referenzarchitekturen beschreiben außerdem einen beidseitigen
Austausch mit Databricks über *BDC Connect* und Delta Sharing sowie die
Föderation von Delta-Lake-Daten nach SAP Datasphere. Konkrete
Oberflächenschritte in Datasphere sind nicht verifiziert. Die Funktion
setzt eine BDC-Bereitstellung mit SAP Databricks voraus.

## 12.10 Abhängigkeiten, Grenzen, Hinweise

-   **Freigabe**: Ohne Freigabe für den Verbrauch sehen weder
    SQL-Benutzer noch OData-Clients ein Objekt (Abschnitt 12.3).

-   **Semantik je Werkzeug**:

-   SAP-Analytics-Cloud-Live: *Analytical Dataset*, *Analytic Model*,
    *Perspective*

-   Excel-Add-in: *Analytic Model*, *Perspective*

-   Analysis for Office: nur *Analytical Dataset* (nicht verifiziert)

-   ODBC/JDBC: Views und Perspektiven

-   **Grenze im Excel-Add-in**: 1 000 000 Ergebnissätze
    (MDS-Standardwert).

-   **OData**: braucht einen OAuth-Client mit Benutzerkontext. Grenzen
    für Seitengröße und Durchsatz sind nicht verifiziert.

-   **Premium Outbound**: Kosten hängen am Volumen und an der Lizenz.
    Läufe brechen ab, wenn das Volumen aufgebraucht ist.

-   **Dateibereiche (\*file spaces\*)** mit dem Speichertyp SAP HANA
    Data Lake Files haben eigene Einschränkungen. Welche Verbrauchswege
    dort möglich sind, ist nicht verifiziert.

-   **Änderungen an der Oberfläche**: SAP ändert die Oberfläche von
    Datasphere und SAP Analytics Cloud vierteljährlich. Schalter- und
    Menütexte sollte man vor der Nutzung in der aktuellen Hilfe prüfen.

## 12.11 Übersicht: Funktion -- Zweck -- benötigtes Privileg

  ------------------------------------------------------------------------------------------------
  **Funktion**                        **Zweck**                        **Benötigtes
                                                                       Privileg/Rolle**
  ----------------------------------- -------------------------------- ---------------------------
  *Expose for Consumption*            Objekt für externe Werkzeuge     Modellierungsrechte im
                                      freigeben                        Bereich (Privileg nicht
                                                                       verifiziert)

  Live-Verbindung SAP Analytics Cloud Live-Analyse analytischer        Recht zum Anlegen von
                                      Modelle                          Verbindungen in SAP
                                                                       Analytics Cloud (nicht
                                                                       verifiziert)

  Excel-Add-in ⚠                      Analyse in Excel über die        Lesezugriff über SAP
                                      SAP-Analytics-Cloud-Verbindung   Analytics Cloud (nicht
                                                                       verifiziert)

  Datenbankbenutzer/Open-SQL-Schema   ODBC/JDBC-Lesezugriff, optional  Bereichsadministrator
                                      Schreibzugriff                   

  OAuth-Client für die OData-API      REST-Zugriff auf Views und       Administrator (Privileg
                                      Modelle                          nicht verifiziert)

  Premium Outbound ⚠                  Replikation an Ziele außerhalb   Administrator für die
                                      von SAP                          Mandantenkonfiguration;
                                                                       Modellierer des
                                                                       Replikationsflusses

  Austausch mit SAP Databricks ⚠      Datenprodukte zwischen BDC und   BDC- und
                                      Databricks austauschen           Databricks-Berechtigungen
                                                                       (nicht verifiziert)
  ------------------------------------------------------------------------------------------------
