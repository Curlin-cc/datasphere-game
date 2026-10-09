# 1. Überblick und Einordnung

## 1.1 Was SAP Datasphere ist

SAP Datasphere ist ein Cloud-Dienst von SAP. Er verbindet, integriert,
modelliert und stellt Daten aus SAP- und Nicht-SAP-Quellen bereit.
Fachlich vereint er Funktionen aus vier Bereichen:

-   Data Warehousing

-   Datenintegration

-   semantische Modellierung

-   Daten-Governance

SAP beschreibt SAP Datasphere heute als zentrale Komponente von SAP
Business Data Cloud. Dort dient SAP Datasphere als „Wissenskern"
(*knowledge core*): Es führt Semantik, Datenprodukte und Modellierung
zusammen. So bleibt der fachliche Kontext der Daten auch in hybriden und
Multi-Cloud-Landschaften erhalten (Produktseite sap.com).

Der Dienst wird als Software-as-a-Service auf der SAP Business
Technology Platform (SAP BTP) betrieben. Die Bedienung erfolgt
vollständig im Webbrowser (nicht verifiziert). Ältere Unterlagen nennen
das Produkt noch *SAP Data Warehouse Cloud*. SAP hat es 2023 in SAP
Datasphere umbenannt (nicht verifiziert). Unter dem früheren Namen
findet man daher noch technische Bezeichnungen, Hinweise (*SAP Notes*)
und Community-Beiträge.

Für Anwender teilt sich SAP Datasphere in mehrere Funktionsbereiche.
Jeder Bereich hat in diesem Handbuch ein eigenes Kapitel:

-   Bereichsverwaltung (*Space Management*)

-   Datenbaustein (*Data Builder*)

-   Business-Baustein (*Business Builder*)

-   Katalog (*Catalog*) und Datenmarktplatz (*Data Marketplace*)

-   Überwachung (*Data Integration Monitor*, *System Monitor*)

-   Administration

## 1.2 Positionierung innerhalb von SAP Business Data Cloud

SAP Business Data Cloud (BDC) ist ein Lösungspaket. Es verbindet die
Funktionen von SAP Datasphere, SAP Analytics Cloud und SAP Business
Warehouse mit einem verwalteten SAP Databricks und mit sogenannten
intelligenten Anwendungen (*Intelligent Applications*). Dazu gehören
auch Datenprodukte (*Data Products*) für SAP-Fachanwendungen
(Produktseite SAP Databricks auf sap.com).

Laut SAP bilden diese Komponenten gemeinsam eine Business Data Fabric.
Sie verknüpft Daten, Kontext und KI über die gesamte Systemlandschaft
und hat eine eingebaute Governance (Darstellung sap.com).

Aufgaben von SAP Datasphere innerhalb von BDC:

  -----------------------------------------------------------------------
  **Aufgabe in BDC**                  **Beitrag von SAP Datasphere**
  ----------------------------------- -----------------------------------
  Semantische Schicht                 Fachliche Modelle, Kennzahlen und
                                      Dimensionen mit Geschäftskontext
                                      (siehe Kapitel 6 und 7)

  Datenprodukte                       Datenprodukte entdecken,
                                      installieren und nutzen, auch von
                                      SAP bereitgestellte (siehe Kapitel
                                      8)

  Integration                         Verbindungen zu SAP- und
                                      Nicht-SAP-Quellen, Replikation,
                                      Föderation (siehe Kapitel 5)

  Governance                          Katalog, Metadaten,
                                      Zugriffssteuerung (siehe Kapitel 8
                                      und 9)
  -----------------------------------------------------------------------

Datenprodukte in BDC werden laut SAP-Referenzarchitektur über
hochwertige Metadaten und das Delta-Sharing-Protokoll bereitgestellt.
Sie sind für intensive Lesezugriffe ausgelegt (SAP Architecture Center).
Welche Datenprodukte und intelligenten Anwendungen konkret verfügbar
sind, hängt vom BDC-Vertrag ab. **⚠ abhängig von Lizenz/Freischaltung**

SAP Datasphere ist weiterhin auch als eigenständiges Abonnement
erhältlich, also ohne BDC (nicht verifiziert). Dieses Handbuch
beschreibt die Oberfläche generisch. Funktionen, die nur im BDC-Kontext
verfügbar sind, werden gesondert gekennzeichnet.

## 1.3 Architekturüberblick

### 1.3.1 Business Data Fabric als Leitbild

SAP verwendet für SAP Datasphere den Begriff *Business Data Fabric*.
Gemeint ist eine Architektur, die nicht alle Daten physisch an einen Ort
kopiert. Stattdessen werden Daten bei Bedarf verbunden (föderiert),
repliziert oder als Datenprodukt geteilt, und ihre Semantik bleibt dabei
erhalten (sap.com). Dahinter steht der Gedanke einer möglichst
kopierfreien Datenbereitstellung (*zero-copy*). SAP beschreibt diesen
Ansatz zum Beispiel für die Nutzung von SAP-BW-Datenprodukten in SAP
Datasphere und SAP Databricks (SAP Architecture Center).

### 1.3.2 SAP HANA Cloud als technische Basis

Technisch basiert SAP Datasphere auf einer SAP HANA Cloud-Datenbank.
Diese Datenbank wird mit dem Mandanten bereitgestellt (nicht
verifiziert). Sie stellt drei Speicherarten bereit:

-   In-Memory-Speicher (*Memory*)

-   Plattenspeicher (*Disk*)

-   Rechenleistung (*Compute*)

Laut der Seite *Configure the Size of Your SAP Datasphere Tenant* werden
diese Ressourcen über Capacity Units zugeteilt (help.sap.com).

Jeder Bereich (siehe 1.3.3) erhält ein eigenes Datenbankschema.
SQL-Zugriffe von außen laufen über Datenbankbenutzer (*Database Users*)
und Open-SQL-Schemas (nicht verifiziert; Details in Kapitel 12).

### 1.3.3 Bereiche (Spaces)

Der Bereich (*Space*) ist die zentrale Organisationseinheit in SAP
Datasphere. Ein Bereich ist eine abgeschottete Arbeitsumgebung mit
eigenen Elementen:

-   Benutzern und Zuordnungen

-   Verbindungen

-   Datenobjekten

-   Speicher- und Rechenkontingenten

Objekte anderer Bereiche lassen sich nur nutzen, wenn sie ausdrücklich
freigegeben werden (*Sharing*) (nicht verifiziert). Neben dem
Standardbereich gibt es Sonderformen wie den Bereichstyp *SAP BW
bridge*. Je nach Mandantenausstattung kommen weitere Typen hinzu, etwa
ein Bereich für dateibasierten Objektspeicher (nicht verifiziert). **⚠
abhängig von Lizenz/Freischaltung**

Wie man Bereiche anlegt, konfiguriert und überwacht, steht in Kapitel 4.

### 1.3.4 Data Lake und Object Store

Daten, die selten genutzt werden oder sehr umfangreich sind, können
außerhalb des In-Memory-Speichers abgelegt werden. Der Capacity Unit
Estimator von SAP führt dafür zwei eigene Ressourcenarten:

-   Data Lake

-   Object Store

Beide werden getrennt von Memory und Disk dimensioniert (SAP Datasphere
Capacity Unit Estimator).

Der Data Lake beruht auf *SAP HANA Cloud, data lake*. Der Object Store
dient im BDC-Kontext als dateibasierter Speicher, unter anderem für
Datenprodukte (nicht verifiziert). Ob eine Speicherart verfügbar ist,
hängt von drei Faktoren ab:

-   Mandantentyp

-   Region bzw. Hyperscaler

-   Vertrag

**⚠ abhängig von Lizenz/Freischaltung**

Hinweis: SAP hat das Angebot an Speicherarten in den letzten Releases
mehrfach verändert. Welche Optionen ein konkreter Mandant anbietet, ist
in der Mandantenkonfiguration nachzusehen (siehe Kapitel 3).

### 1.3.5 Gesamtbild in Schichten

  ------------------------------------------------------------------------
  **Schicht**             **Bestandteile           **Kapitel**
                          (Kurzüberblick)**        
  ----------------------- ------------------------ -----------------------
  Quellen                 SAP S/4HANA, SAP BW,     5
                          Cloud-Anwendungen,       
                          Datenbanken, Dateien     

  Integration             Verbindungen,            5, 6
                          Replikations-, Daten-    
                          und                      
                          Transformationsflüsse,   
                          Föderation               

  Speicherung             SAP HANA Cloud           3, 4
                          (Memory/Disk), Data      
                          Lake, Object Store       

  Modellierung            Data Builder, Business   6, 7
                          Builder                  

  Governance              Katalog,                 8, 9
                          Datenmarktplatz,         
                          Datenprodukte,           
                          Berechtigungen           

  Betrieb                 Monitoring, Transport,   10, 11
                          Lebenszyklus             

  Verbrauch               SAP Analytics Cloud,     12
                          Werkzeuge von            
                          Drittanbietern,          
                          SQL/OData                
  ------------------------------------------------------------------------

## 1.4 Zusammenspiel mit anderen SAP-Produkten

### 1.4.1 SAP Analytics Cloud

SAP Analytics Cloud (SAC) ist das Standardwerkzeug für die Analyse von
Daten aus SAP Datasphere. Seine Aufgaben:

-   Berichte (*Stories*)

-   Dashboards

-   Planung

SAC greift in der Regel über eine Live-Verbindung auf analytische
Modelle in SAP Datasphere zu, ohne die Daten zu kopieren (nicht
verifiziert). In BDC sind SAP Analytics Cloud und SAP Datasphere als
gemeinsame Bestandteile vorgesehen (sap.com). Die technischen
Verbrauchswege beschreibt Kapitel 12.

### 1.4.2 SAP Databricks

SAP Databricks ist eine von SAP verwaltete Databricks-Umgebung innerhalb
von BDC (sap.com). Sie ist für Data-Engineering-, Machine-Learning- und
KI-Szenarien gedacht.

Der Datenaustausch mit SAP Datasphere läuft über Datenprodukte und Delta
Sharing (SAP Architecture Center). So stehen Daten aus SAP-Anwendungen
in Databricks zur Verfügung, ohne dass jedes Mal eine eigene Replikation
nötig ist. **⚠ abhängig von Lizenz/Freischaltung (nur im BDC-Kontext)**

### 1.4.3 SAP BW und SAP BW Bridge

Für Kunden mit bestehendem SAP BW bzw. SAP BW/4HANA gibt es zwei Wege:

-   **Anbindung und Datenprodukte:** Vorhandene BW-Systeme lassen sich
    als Quelle anbinden. Laut SAP-Referenzarchitektur können sie in BDC
    außerdem als Datenprodukte genutzt werden: in SAP Datasphere für
    Analysen, in SAP Databricks für ML/KI (SAP Architecture Center).

-   **SAP BW Bridge:** Eine ABAP-basierte BW-Umgebung, die innerhalb von
    SAP Datasphere bereitgestellt wird. Sie dient dazu, vorhandene
    BW-Ladelogik (*Staging*) und Datenflüsse wiederzuverwenden und in
    die Cloud zu übernehmen. Ihre Objekte werden über einen eigenen
    Bereichstyp in SAP Datasphere eingebunden (nicht verifiziert). Die
    BW Bridge wird im Estimator als eigene Kapazitätsart geführt (SAP
    Datasphere Capacity Unit Estimator). **⚠ abhängig von
    Lizenz/Freischaltung**

## 1.5 Mandant (Tenant) und Bereitstellung

Ein Mandant (*Tenant*) ist eine eigenständige Instanz von SAP
Datasphere. Er hat eine eigene URL, eigene Benutzer, eigene Bereiche und
eine eigene SAP HANA Cloud-Datenbank (nicht verifiziert).

Bereitgestellt wird ein Mandant auf zwei Wegen (nicht verifiziert):

-   über ein Abonnement

-   über ein verbrauchsbasiertes Modell der SAP BTP im SAP BTP Cockpit

Die Rechenzentren liegen je nach Region bei einem der Hyperscaler, die
SAP unterstützt. **⚠ Funktionsumfang abhängig von Region/Hyperscaler**

Beim Aufbau einer Landschaft kann der Kunde mehrere Mandanten betreiben,
zum Beispiel getrennt für Entwicklung, Test und Produktion. Inhalte
werden dann zwischen den Mandanten transportiert (siehe Kapitel 11).

Erstkonfiguration, Benutzerverwaltung und Identitätsanbieter beschreibt
Kapitel 3. Anmeldung und Navigation in der Oberfläche beschreibt Kapitel
2.

## 1.6 Lizenz- und Kapazitätsmodell (Grundzüge)

Die Abrechnungseinheit von SAP Datasphere ist die Capacity Unit (CU).
Laut SAP-Dokumentation werden einem Mandanten Capacity Units zugeteilt,
um Speicher- und Rechenressourcen zu erhalten. Die Größe lässt sich nach
dem fachlichen Bedarf konfigurieren. Das gilt sowohl für Mandanten auf
Abonnementbasis als auch für verbrauchsbasierte Mandanten mit
Standardplan (help.sap.com, *Configure the Size of Your SAP Datasphere
Tenant*).

Der offizielle Capacity Unit Estimator von SAP ermittelt den CU-Bedarf
aus folgenden Ressourcen:

  -----------------------------------------------------------------------
  **Ressource (Bezeichnung im         **Grobe Bedeutung**
  Estimator)**                        
  ----------------------------------- -----------------------------------
  *Storage*                           Plattenspeicher der SAP HANA
                                      Cloud-Datenbank

  *Compute*                           Arbeitsspeicher und Rechenleistung

  *Data Lake*                         Speicher in SAP HANA Cloud, data
                                      lake

  *BW Bridge*                         Kapazität der
                                      SAP-BW-Bridge-Umgebung

  *Data Integration*                  Ausführungskapazität für
                                      Integrationsaufgaben

  *Catalog*                           Kapazität des Katalogs

  *Premium Outbound*                  Ausgehende Datenintegration in
                                      Ziele außerhalb von SAP

  *Elastic Compute Nodes*             Zusätzliche, zeitweise zuschaltbare
                                      Rechenknoten

  *Object Store*                      Dateibasierter Objektspeicher
  -----------------------------------------------------------------------

Die Bezeichnungen der Ressourcen sind im Estimator belegt (SAP
Datasphere Capacity Unit Estimator). Die Spalte „Grobe Bedeutung" ist
eine Zusammenfassung und nicht verifiziert.

Der SAP-Hinweis 3507826 bestätigt: CU sind die Einheiten, die von den
zugrunde liegenden Diensten von SAP Datasphere verbraucht werden. Den
Bedarf ermittelt man mit dem Estimator (SAP Note 3507826).

Für die Praxis wichtig:

1.  Die Mandantengröße wird in der Mandantenkonfiguration festgelegt.
    Manche Änderungen, etwa eine Verkleinerung des Speichers, sind nur
    eingeschränkt oder gar nicht möglich (nicht verifiziert; siehe
    Kapitel 3).

2.  Die Ressourcen des Mandanten werden in der Bereichsverwaltung auf
    die einzelnen Bereiche verteilt (siehe Kapitel 4).

3.  Den Verbrauch überwacht man im System Monitor (siehe Kapitel 10).

Preise und Umrechnungsfaktoren von CU in Ressourcen ändert SAP
regelmäßig. Sie stehen deshalb nicht in diesem Handbuch. Maßgeblich sind
der aktuelle Estimator und der eigene Vertrag.

## 1.7 Lesehinweise zum Dokument

-   **Aufbau:** Kapitel 2 führt in die Oberfläche und die Navigation
    ein. Kapitel 3 bis 12 beschreiben je einen Funktionsbereich nach
    demselben Schema: Zweck, Aufruf, Oberflächenaufbau, Funktionen,
    typische Abläufe, Grenzen und eine Berechtigungstabelle. Kapitel 13
    enthält das Glossar Deutsch/Englisch und das Quellenverzeichnis.

-   **Begriffe:** Die Oberfläche von SAP Datasphere ist überwiegend
    englisch. Offizielle UI-Bezeichnungen stehen beim ersten Auftreten
    kursiv in Klammern. Danach wird der deutsche Begriff verwendet.

-   **Stand und Änderungen:** SAP aktualisiert SAP Datasphere in kurzen
    Abständen. Menüs, Schaltflächentexte und Dialoge können sich deshalb
    ändern. Exakte Oberflächentexte werden nur genannt, wenn die
    Dokumentation sie belegt.

-   **Kennzeichnungen:** Lizenz-, Beta-, Hyperscaler- oder
    mandantenabhängige Funktionen sind mit „⚠ abhängig von
    Lizenz/Freischaltung" markiert. Nicht belegte Aussagen sind mit
    „nicht verifiziert" gekennzeichnet.

-   **Rollen:** Sichtbarkeit und Bedienbarkeit von Funktionen hängen von
    den zugewiesenen Rollen und Privilegien ab. Fehlt ein Menüeintrag,
    liegt das meist an der Berechtigung (siehe Kapitel 3 und 9).
