# 10. Monitoring: Data Integration Monitor und System Monitor

## 10.1 Zweck und Einordnung

Das Monitoring in SAP Datasphere besteht aus zwei sich ergänzenden
Werkzeugen:

-   **Data Integration Monitor** (*Data Integration Monitor*, in der
    Seitenleiste als *Data Integration*): Hier planen, starten und
    überwachen Sie Datenintegrationsaufgaben. Das umfasst die
    Replikation von Remote-Tabellen, die Persistenz von Views,
    Datenflüsse, Replikationsflüsse und Transformationsflüsse sowie
    Aufgabenketten (*Task Chains*). Außerdem verfolgen Sie hier Abfragen
    an angebundene Quellsysteme und verwalten lokale Tabellen, etwa beim
    Löschen von Daten oder bei Bereinigungsaufgaben (*housekeeping*).
    Der Monitor arbeitet immer im Kontext eines Bereichs (*Space*).

-   **System Monitor** (*System Monitor*): Er richtet sich an
    Administratoren und zeigt die Leistung des gesamten Tenants über
    alle Bereiche hinweg. Dazu gehören Speicher- und
    Arbeitsspeicherverbrauch, Aufgaben- und Anweisungsprotokolle,
    Out-of-Memory-Situationen und, sofern lizenziert, Elastic Compute
    Nodes.

Wie Sie Objekte anlegen, die hier überwacht werden, beschreibt Kapitel 6
(Data Builder). Wie Sie das System konfigurieren, etwa
Protokollaufbewahrung oder Elastic Compute Nodes, beschreibt Kapitel 3.

## 10.2 Aufruf, Navigation und Berechtigungen

**Aufruf.** Beide Monitore erreichen Sie über die Gruppe Überwachung
(*Monitoring*) in der Seitenleiste (siehe Kapitel 2). Die Dokumentation
nennt dafür den Pfad *Monitoring \> Data Integration \> Flows*. Im Data
Integration Monitor wählen Sie zuerst einen Bereich aus und danach den
Monitortyp.

**Rollen.** Laut Dokumentation verwenden vor allem Benutzer mit der
Rolle Bereichsadministrator (*Space Administrator*) oder Integrator
(*Integrator*) den Data Integration Monitor (Rollenkonzept siehe Kapitel
3 und 9). Für den Flows-Monitor werden in einer bereichsbezogenen Rolle
(*scoped role*) diese Privilegien genannt:

-   *Data Warehouse General* (-R\-\-\-\-\--): Zugriff auf SAP Datasphere

-   *Data Warehouse Data Integration* (-R\-\-\-\-\--):
    Aufgabenprotokolle im Data Integration Monitor anzeigen

-   *Data Warehouse Data Integration* (\--U\-\-\-\--):
    Datenintegrationsaufgaben manuell ausführen

-   *Data Warehouse Data Integration* (\-\-\-\--E\--): Aufgaben
    einplanen (**nicht verifiziert**, die Quelle war nur verkürzt
    lesbar)

Für den System Monitor sind administrative Rechte nötig, typischerweise
über die Rolle *DW Administrator*. Das genaue Einzelprivileg ist **nicht
verifiziert**.

## 10.3 Data Integration Monitor

### 10.3.1 Aufbau der Oberfläche

Nach Auswahl des Bereichs zeigt der Monitor Kacheln bzw. Registerkarten
für die einzelnen Monitortypen:

-   Remote-Tabellen (*Remote Tables*)

-   Lokale Tabellen (*Local Tables*)

-   Views (*Views*)

-   Flüsse (*Flows*)

-   Remote-Abfragen (*Remote Queries*)

-   Aufgabenketten (*Task Chains*)

Jeder Monitor zeigt zunächst eine **Übersichtsliste** mit den aktuell
eingeplanten und den bereits ausgeführten Aufgaben. Über der Liste liegt
eine Werkzeugleiste mit Aktionen für die markierten Objekte, außerdem
gibt es Such- und Filterfunktionen. Ein Klick auf ein Objekt öffnet die
**Detailansicht**. Sie enthält die Ausführungshistorie (*Runs*) mit den
zugehörigen Protokollmeldungen und je nach Objekttyp weitere
Registerkarten, etwa für Partitionen oder Statistiken.

### 10.3.2 Remote-Tabellen (Remote Tables)

**Zweck.** Die Übersicht fasst alle eingeplanten und bereits
ausgeführten Replikationsaufgaben für Remote-Tabellen zusammen. Sie
zeigt Zeitplan und Aktualisierungsfrequenz, Statistiken zum
Arbeitsspeicher- und Plattenverbrauch sowie die letzte Aktualisierung
bzw. Ausführung.

**Wichtige Spalten** (Bezeichnungen teilweise **nicht verifiziert**):

  -----------------------------------------------------------------------
  **Spalte**                          **Bedeutung**
  ----------------------------------- -----------------------------------
  Name / Verbindung                   Objekt und die Quellverbindung
                                      (siehe Kapitel 5)

  Datenzugriff (*Data Access*)        *Remote* (Federation), *Replicated
                                      (Snapshot)* oder *Replicated
                                      (Real-Time)*

  Aktualisierungsfrequenz (*Refresh   z\. B. keine, eingeplant, Echtzeit
  Frequency*)                         

  Status                              Status der letzten Ausführung

  Letzte Aktualisierung / nächster    Zeitpunkte
  Lauf                                

  Arbeitsspeicher / Plattenplatz      belegter In-Memory- bzw.
                                      Plattenspeicher

  Anzahl Datensätze                   Anzahl der replizierten Datensätze
  -----------------------------------------------------------------------

Dass die Spalte *Data Access* die drei genannten Werte annehmen kann,
ist in einem SAP-Hinweis zu den Datenzugriffsarten belegt.

**Aktionen** (exakte Beschriftungen **nicht verifiziert**):

-   neuen Snapshot laden (vollständige Momentaufnahme)

-   replizierte Daten entfernen (zurück zum Fernzugriff)

-   Echtzeitreplikation aktivieren oder deaktivieren ⚠ abhängig von
    Verbindungstyp und Quelle

-   Zeitplan anlegen, bearbeiten, löschen, anhalten oder fortsetzen
    (siehe 10.3.8)

-   Partitionen und Filter für die Replikation definieren

-   Statistiken für Remote-Tabellen anlegen, um föderierte Abfragen zu
    optimieren

### 10.3.3 Lokale Tabellen (Local Tables)

In diesem Monitor verwalten Sie lokale Tabellen: Sie löschen Daten und
führen Bereinigungsaufgaben aus, etwa für Delta-Tabellen (siehe Kapitel
6). Einzelne Optionen und Spalten sind **nicht verifiziert**.

### 10.3.4 Views (Views): Persistenz, Partitionierung, View Analyzer

**Zweck.** Der Views-Monitor zeigt die im Data Builder erstellten Views.
Sie können diese Views persistieren, also ihre Daten lokal als
Momentaufnahme speichern, um den Zugriff zu beschleunigen. Die
Persistenz läuft entweder direkt oder über einen Zeitplan.

**Funktionen:**

-   **Datenpersistenz starten bzw. neuen Snapshot laden:** Die View wird
    ausgeführt, das Ergebnis wird gespeichert.

-   **Persistierte Daten entfernen:** Die View wird wieder virtuell
    gelesen.

-   **Zeitplan** für wiederkehrende Persistenzläufe (siehe 10.3.8).

-   **Partitionierung:** In der Detailansicht der View legen Sie
    Partitionen auf Spalten des Datensatzes an. So zerlegen Sie große
    Datenmengen in kleinere, besser handhabbare Teile, um sie überhaupt
    oder schneller persistieren zu können. Die Bedingungen, die eine
    Partitionsspalte erfüllen muss, sind hier **nicht verifiziert**.

-   **View Analyzer** (*View Analyzer*): Er analysiert eine View samt
    ihrer abhängigen Views. Er liefert Kennzahlen zum Speicherverbrauch
    und Empfehlungen, auf welcher Ebene sich eine Persistenz lohnt. Ob
    er außerdem SQL-Ausführungspläne (*Explain Plan*/*PlanViz*) erzeugen
    kann und welche Zusatzprivilegien dafür nötig sind, ist **nicht
    verifiziert**.

**Spalten** (**nicht verifiziert**): u. a. Datenzugriff
(virtuell/persistiert), Status, Aktualisierungsfrequenz, letzte
Aktualisierung, Anzahl Datensätze, Arbeitsspeicher- und Plattengröße,
nächster Lauf.

### 10.3.5 Flüsse (Flows), einschließlich Replikationsflüssen

**Zweck.** Der Flows-Monitor listet je Bereich alle bereitgestellten
Flüsse: Datenflüsse (*data flows*), Replikationsflüsse (*replication
flows*) und Transformationsflüsse (*transformation flows*). Sie können
sie hier über die Aktion „Ausführen" (*Run*) starten und ihre
Ausführungsdetails einsehen. Wie Sie die Flüsse modellieren, beschreibt
Kapitel 6.

**Replikationsflüsse.** Für einen bestehenden Lauf eines
Replikationsflusses stehen laut Dokumentation folgende Möglichkeiten zur
Verfügung:

-   Lauf **anhalten** und später **fortsetzen**

-   Lauf ganz **stoppen**, wenn er nicht mehr gebraucht wird

-   Lauf **einplanen**

-   **Premium-Outbound-Volumen** überwachen ⚠ abhängig von
    Lizenz/Freischaltung (relevant bei Zielen außerhalb von SAP
    Datasphere)

-   **E-Mail-Benachrichtigungen** bei Fehlern des Replikationsflusses
    konfigurieren

Wie Sie Schemata und Einstellungen eines bestehenden Replikationsflusses
ändern, beschreibt Kapitel 6. Welche Kennzahlen die Detailansicht je
Objekt zeigt (z. B. Initial- und Delta-Ladung), ist im Einzelnen **nicht
verifiziert**.

### 10.3.6 Aufgabenketten (Task Chains)

**Zweck.** Der Monitor zeigt Status und Fortschritt von Aufgabenketten,
also von zusammengesetzten Folgen aus Integrationsaufgaben.

**Funktionen:**

-   Aufgabenketten ausführen und einplanen. Beides ist auch direkt nach
    dem Anlegen im Editor möglich (siehe Kapitel 6).

-   E-Mail-Benachrichtigung einrichten. Das geschieht im Editor der
    Aufgabenkette.

-   Läufe und die Unteraufgaben je Schritt mit ihren Protokollen
    einsehen.

-   Fehlgeschlagene Läufe erneut starten oder hängende Läufe auf
    „fehlgeschlagen" setzen (**nicht verifiziert**).

-   Protokolle zusätzlich über die Befehlszeilenschnittstelle datasphere
    auflisten und lesen (siehe Kapitel 12).

**Hinweis:** Der Aufgabenketten-Monitor braucht Zeit, um die
Statusinformationen aller Aufgaben zu sammeln. Die angezeigten
Laufzeiten können deshalb leicht von denen im jeweiligen Detailmonitor
abweichen, etwa im Views- oder Flows-Monitor.

### 10.3.7 Remote-Abfragen (Remote Queries)

**Zweck.** Der Monitor zeigt die Abfragen, die ein Bereich an
angebundene Quellsysteme sendet. Das hilft, wenn Sie Ausführungen von
Storys, Views oder Vorschauen analysieren wollen: Der Monitor liefert
Details zu einzelnen Leseanfragen, etwa Laufzeit und Größe der
Ergebnismenge.

Typische Angaben (**nicht verifiziert**): Verbindung, Status, Startzeit,
Dauer, gelesene Datensätze, Remote-Anweisung (SQL-Text, aufrufbar als
Detail). Ob es eine eigene Unterregisterkarte für Remote-Anweisungen
gibt, ist **nicht verifiziert**.

### 10.3.8 Zeitpläne (Schedules)

Sie können folgende Aufgaben einplanen oder ihren Zeitplan wieder
entfernen: Replikation von Remote-Daten, Datenpersistenz, Datenflüsse,
Replikationsflüsse und Aufgabenketten. Eingeplante Läufe lassen sich
anhalten und später fortsetzen.

-   **Einfacher Zeitplan** (*Simple Schedule*): Sie wählen Frequenz,
    Startzeitpunkt und Zeitraum über die Oberfläche aus.

-   **Cron-Ausdruck** (*Cron Expression*): Für komplexere Muster wie
    „werktags zweimal täglich".

-   **Zustimmung** (*Consent*): Damit wiederkehrende Aufgaben in Ihrem
    Namen laufen, müssen Sie die Job-Scheduling-Komponente autorisieren.
    Das geschieht in den Profileinstellungen unter *Authorized Consent
    Settings*, wo Sie die Zustimmung auch widerrufen können. Fehlt sie,
    erscheint oben im Monitor eine Aufforderung. Dass die Zustimmung
    nach einer bestimmten Frist abläuft, ist **nicht verifiziert**.

-   Ob sich die Verantwortung für einen Zeitplan auf einen anderen
    Benutzer übertragen lässt (*Assign Schedule to Me*), ist **nicht
    verifiziert**.

## 10.4 System Monitor

### 10.4.1 Aufbau

Laut Dokumentation dienen die Monitoring-Apps dazu, die Systemleistung
zu überwachen und Probleme mit Speicher, Aufgaben,
Out-of-Memory-Situationen und Ähnlichem zu erkennen. Die Registerkarten
sind:

-   **Dashboard**

-   **Logs** mit Unterbereichen für Aufgaben (*Tasks*) und Anweisungen
    (*Statements*). Ein SAP-Hinweis nennt dafür die Bezeichnung
    *Statement Logs*. Dass die Unterbereiche in neueren Versionen eigene
    Registerkarten sind, ist **nicht verifiziert**.

-   **Elastic Compute Nodes**: inzwischen als eigene App dokumentiert ⚠

### 10.4.2 Dashboard: Platten- und Arbeitsspeicher

Das Dashboard zeigt Kacheln zu Kennzahlen des gesamten Tenants. Belegt
ist, dass hier Speicher- und Out-of-Memory-Probleme erkennbar sind. Die
konkreten Kacheln sind **nicht verifiziert**, typischerweise sind es:

-   belegter und zugewiesener Plattenspeicher je Bereich

-   Arbeitsspeicherverbrauch je Bereich

-   die Top-Bereiche bzw. Top-Anweisungen nach Speicherverbrauch

-   fehlgeschlagene Aufgaben

-   Out-of-Memory-Ereignisse

Die Angaben je Bereich hängen mit den Speicherzuteilungen aus Kapitel 4
zusammen.

### 10.4.3 Logs: Aufgaben und Anweisungen

-   **Aufgaben** (*Tasks*): Übersicht über die Läufe von
    Integrationsaufgaben aller Bereiche, mit Status, Dauer und
    Speicherverbrauch.

-   **Anweisungen** (*Statements*): SQL-Anweisungen mit Kennzahlen wie
    Spitzenspeicher und CPU-Zeit. Auffällige Anweisungen werden nur
    erfasst, wenn Expensive Statement Tracing aktiv ist (siehe 10.4.4).

### 10.4.4 Konfiguration des Monitorings

In der Monitoring-Konfiguration (Systemkonfiguration, siehe Kapitel 3)
aktivieren Sie **Expensive Statement Tracing** (*Enable Expensive
Statement Tracing*). Damit analysieren Sie einzelne SQL-Abfragen, die
einen oder mehrere Schwellenwerte überschreiten. Sie können die
Standardeinstellungen übernehmen oder Parameter zum Filtern des Traces
festlegen.

Außerdem können Sie mit SAP-HANA-Monitoring-Views arbeiten. Deren Daten
stehen bereits in den Monitoring-Apps zur Verfügung. Wer sie direkt
nutzt, kann darüber hinausgehende Analysen durchführen, die der
Standardmonitor nicht bietet. Administratoren können zur Fehlersuche
Datenbankanalysebenutzer anlegen (siehe Kapitel 3).

### 10.4.5 Elastic Compute Nodes ⚠ abhängig von Lizenz/Freischaltung

Hier überwachen Sie Elastic Compute Nodes anhand folgender Kennzahlen:

-   Konfiguration

-   Laufdetails, z. B. Start- und Endzeit des letzten Laufs

-   CPU- und Arbeitsspeicherverbrauch, einschließlich des Speichers für
    Datenreplikation

-   Betriebszeit (*uptime*)

-   Top-Anweisungen

-   Fehler

Sie dienen dazu, Probleme zu untersuchen und Ressourcen gezielt zu
verteilen. Wie Sie Knoten anlegen, starten und stoppen, beschreibt
Kapitel 3.

## 10.5 Aufgabenprotokolle und Benachrichtigungen

**Aufgabenprotokolle** (*Task Logs*). Jede Ausführung einer
Integrationsaufgabe erzeugt ein Protokoll. Sie sehen es in der
Detailansicht des jeweiligen Monitors und bereichsübergreifend im System
Monitor. Ein Protokoll enthält Status, Laufzeit und Meldungen.
Statuswerte wie *Running*, *Completed* und *Failed* sowie eine Aktion
zum Abbrechen laufender Ausführungen sind **nicht verifiziert**. Wie
lange Protokolle aufbewahrt bzw. wann sie gelöscht werden, legen Sie in
der Systemkonfiguration fest (siehe Kapitel 3; Einstellung **nicht
verifiziert**).

**Benachrichtigungen bei Fehlern:**

-   **E-Mail** bei fehlgeschlagenen Aufgabenketten und
    Replikationsflüssen (belegt, siehe 10.3.5 und 10.3.6)

-   **In-App-Benachrichtigungen** in der Shell (siehe Kapitel 2) bei
    fehlgeschlagenen eingeplanten Aufgaben (**nicht verifiziert**)

-   **Externe Überwachung** über das Health Monitoring von SAP Cloud ALM
    ⚠ abhängig von Lizenz/Freischaltung. Dort aktivieren Sie die
    Datenerfassung für das SAP-Datasphere-System.

## 10.6 Typische Abläufe

**A. Remote-Tabelle regelmäßig als Snapshot replizieren**

192. Data Integration Monitor öffnen, Bereich wählen, Monitor *Remote
     Tables* öffnen.

193. Remote-Tabelle markieren und einen Snapshot laden.

194. Zustimmung für das Job Scheduling erteilen, falls die Aufforderung
     erscheint (siehe 10.3.8).

195. Einen Zeitplan anlegen, als einfachen Zeitplan oder per
     Cron-Ausdruck.

196. In der Detailansicht Status und Protokoll des Laufs prüfen.

**B. Große View persistieren**

197. Monitor *Views* öffnen und die View auswählen.

198. Mit dem View Analyzer prüfen, auf welcher Ebene sich eine
     Persistenz lohnt.

199. In der Detailansicht Partitionen auf einer geeigneten Spalte
     anlegen.

200. Die Datenpersistenz starten oder einplanen.

201. Speicherkennzahlen und Protokoll prüfen.

**C. Fehlgeschlagene Aufgabenkette analysieren**

202. Die E-Mail-Benachrichtigung erhalten oder den Monitor *Task Chains*
     öffnen.

203. Den fehlgeschlagenen Lauf öffnen und den fehlerhaften Schritt
     ermitteln.

204. In den Detailmonitor wechseln (*Views* bzw. *Flows*) und dort die
     Protokollmeldungen auswerten.

205. Den Fehler beheben und den Lauf erneut starten.

**D. Speicherengpass untersuchen (Administration)**

206. Expensive Statement Tracing aktivieren (siehe 10.4.4).

207. Im Dashboard des System Monitors die Bereiche mit hohem Verbrauch
     und die Out-of-Memory-Ereignisse prüfen.

208. Unter *Logs* die betroffenen Aufgaben bzw. Anweisungen öffnen.

209. Den zuständigen Bereichsadministrator informieren, z. B. damit
     Persistenz oder Partitionierung angepasst werden.

## 10.7 Abhängigkeiten, Grenzen, Hinweise

-   Der Data Integration Monitor zeigt immer nur einen Bereich.
    Bereichsübergreifend sieht nur der System Monitor.

-   Eingeplante Aufgaben laufen nur mit gültiger Zustimmung des
    Benutzers, der sie eingeplant hat.

-   Laufzeitangaben im Aufgabenketten-Monitor können von denen der
    Detailmonitore abweichen.

-   Ohne aktiviertes Expensive Statement Tracing fehlen wichtige
    Informationen, etwa zum Spitzenspeicher.

-   Echtzeitreplikation, Premium-Outbound-Volumen, Elastic Compute Nodes
    und SAP Cloud ALM sind ⚠ abhängig von Lizenz/Freischaltung bzw.
    Quellsystem.

-   Oberflächentexte ändern sich mit den Quartalsreleases.

## 10.8 Übersicht: Funktion -- Zweck -- benötigtes Privileg

  -------------------------------------------------------------------------
  **Funktion**              **Zweck**               **Benötigtes Privileg
                                                    (bereichsbezogen,
                                                    sofern nicht anders
                                                    angegeben)**
  ------------------------- ----------------------- -----------------------
  Monitore und Protokolle   Status und Historie     *Data Warehouse
  anzeigen                  einsehen                General*
                                                    (-R\-\-\-\-\--), *Data
                                                    Warehouse Data
                                                    Integration*
                                                    (-R\-\-\-\-\--)

  Aufgaben manuell          Daten laden oder        *Data Warehouse Data
  ausführen (Snapshot,      aktualisieren           Integration*
  Persistenz, Flow, Kette)                          (\--U\-\-\-\--)

  Zeitpläne anlegen,        Wiederkehrende          *Data Warehouse Data
  anhalten, fortsetzen      Ausführung              Integration*
                                                    (\-\-\-\--E\--)
                                                    (**nicht
                                                    verifiziert**) +
                                                    Zustimmung

  Partitionen, View         Persistenz optimieren   wie Ausführen;
  Analyzer                                          Zusatzrechte für
                                                    Ausführungspläne
                                                    **nicht verifiziert**

  Replikationsfluss         Laufsteuerung           wie Ausführen (**nicht
  anhalten, fortsetzen,                             verifiziert**)
  stoppen                                           

  E-Mail-Benachrichtigung   Fehleralarmierung       Änderungsrecht am
  (Kette,                                           Objekt (**nicht
  Replikationsfluss)                                verifiziert**)

  System Monitor            Überwachung des Tenants Administratorrolle, z.
  (Dashboard, Logs)                                 B. *DW Administrator*
                                                    (**nicht verifiziert**)

  Expensive Statement       Analyse teurer          Recht zur
  Tracing konfigurieren     Anweisungen             Systemkonfiguration
                                                    (**nicht verifiziert**)

  Elastic Compute Nodes     Ressourcensteuerung     Administratorrolle
  überwachen ⚠                                      (**nicht verifiziert**)
  -------------------------------------------------------------------------
