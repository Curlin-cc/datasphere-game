# 9. Sicherheit und Datenzugriff

## 9.1 Zweck und Einordnung

Dieses Kapitel behandelt die Funktionen, mit denen SAP Datasphere den
Zugriff auf Daten regelt, protokolliert und schützt. Dazu gehören:

-   **Datenzugriffskontrollen** (*Data Access Controls*, DAC) für die
    Sicherheit auf Zeilenebene (*Row-Level Security*),

-   die **Berechtigungsmatrix** der Privilegien,

-   die **Audit-Protokollierung** (*Audit Logging*) für Lese- und
    Änderungsvorgänge,

-   die **Sicherheit von Datenbankbenutzern** (*Database Users*),

-   der **Datenschutz** (*Data Protection and Privacy*),

-   die **Verschlüsselung ruhender Daten** (*Data Encryption at Rest*)
    mit kundenverwalteten Schlüsseln (*Customer-Managed Keys*, CMK).

Benutzer, Rollen und Rollenzuweisung sind in Kapitel 3 beschrieben. Das
Anlegen von Bereichen (*Spaces*) und Datenbankbenutzern steht in Kapitel
4, das Monitoring in Kapitel 10. Hier werden nur die Sicherheitsaspekte
dieser Funktionen erläutert.

Grundsatz: Ohne Datenzugriffskontrolle können alle Benutzer, die einem
Bereich zugeordnet sind, alle Daten in diesem Bereich sehen und nutzen.
Datenzugriffskontrollen schränken die sichtbaren Datensätze je Benutzer
ein.

## 9.2 Aufruf und Navigation

  ---------------------------------------------------------------------------
  **Funktion**              **Einstieg in der         **Benötigte
                            Oberfläche**              Rolle/Berechtigung**
  ------------------------- ------------------------- -----------------------
  Datenzugriffskontrollen   Seitenleiste:             Privileg *Data Access
  anlegen und bearbeiten    Datenbaustein (*Data      Control* im Bereich
                            Builder*), Bereich        (genaue Rollenzuordnung
                            wählen, Editor für        nicht verifiziert)
                            Datenzugriffskontrollen   

  Datenzugriffskontrolle    Editor für grafische      Rechte zum Ändern von
  einem View zuweisen       Views bzw. SQL-Views im   Views im Bereich (siehe
                            Datenbaustein             Kapitel 6)

  Audit-Protokollierung je  *Space Management* →      Bereichsadministrator
  Bereich                   Bereich → *Edit Space* →  (*Space Administrator*)
                            *Auditing*                

  Audit-Protokolle von      Bereichsseite →           Bereichsadministrator
  Datenbankbenutzern        Datenbankbenutzer         
                            auswählen →               
                            Audit-Optionen            

  Übersicht und Löschen der Administrationsbereich    Administrator
  Audit-Protokolle aller    (genauer Menüpfad nicht   
  Bereiche                  verifiziert)              

  Kennwortrichtlinie für    Administration (siehe     Administrator
  Datenbankbenutzer         Kapitel 3; Menüpfad nicht 
                            verifiziert)              

  Kundenverwalteter         Kein eigener Menüpunkt    Administrator und SAP ⚠
  Schlüssel                 belegt; SAP muss die      
                            Verschlüsselung ausführen 
  ---------------------------------------------------------------------------

Hinweis: SAP ändert die Benutzeroberfläche quartalsweise. Menüpfade und
Dialogtexte sollten deshalb vor der Freigabe gegen die aktuelle Hilfe
geprüft werden.

## 9.3 Datenzugriffskontrollen (Data Access Controls)

### 9.3.1 Konzept und Aufbau

Eine Datenzugriffskontrolle beruht immer auf einer
**Berechtigungsentität** (*Permissions Entity*). Diese Tabelle bzw.
dieser View legt fest, welche Werte jeder Benutzer sehen darf. Laut
SAP-Blog kann die Berechtigungsentität eine lokale Tabelle, ein View
oder eine Tabellenfunktion sein; eine Bestätigung in der Hilfe ist nicht
verifiziert.

Aus einer Berechtigungsentität lassen sich eine oder mehrere
Datenzugriffskontrollen ableiten. In jeder davon wählt man eine oder
mehrere Spalten aus, die als Kriterien (*Criteria*) gelten sollen.

Die Benutzer werden über eine **Kennungsspalte** (*Identifier Column*)
zugeordnet, die die Benutzer-ID enthält. Als Kennung können auch Werte
aus benutzerdefinierten Anwendungsattributen (*Custom Application
Attributes*) des Identitätsanbieters dienen. Die Bedingung gilt dann für
alle Benutzer mit diesem Attributwert.

Ein von SAP beschriebenes typisches Szenario trennt die Verantwortung:

168. Fachanwender pflegen die Berechtigungsentität in einem Bereich.

169. Dieser Bereich gibt die Entität für einen zweiten Bereich frei.

170. Im zweiten Bereich legen technische Benutzer daraus
     Datenzugriffskontrollen an und weisen sie Views zu.

Für die Kriterien gibt es drei Typen. Sie werden in den folgenden
Abschnitten beschrieben.

### 9.3.2 Typ „Einzelwerte" (Single Values)

**Was:** Die Kriterien sind Einzelwerte. **Wirkung:** Ein Benutzer sieht
nur die Datensätze, die mindestens einem der für ihn hinterlegten
Einzelwerte entsprechen. **Wofür:** Einfache Einschränkungen, z. B. nach
Verkaufsorganisation, Werk oder Region. **Wichtigste Einstellungen:**

-   Berechtigungsentität,

-   Kennungsspalte (Benutzer),

-   eine oder mehrere Kriterienspalten.

### 9.3.3 Typ „Operator und Werte" (Operator and Values)

**Was:** Die Kriterien sind Paare aus Operator und Wert. **Wirkung:**
Ein Benutzer sieht nur die Datensätze, die die für ihn hinterlegten
Paare erfüllen. Komplexe UND-/ODER-Verknüpfungen werden unterstützt.
**Wofür:** Bereichs- und Musterbedingungen, wie sie aus
Analyseberechtigungen bekannt sind. **Hinweis:** Welche Operatoren genau
unterstützt werden und wie die Spalten der Berechtigungsentität
aufgebaut sein müssen, ist nicht verifiziert. Das Hilfethema „Create an
‚Operator and Values' Data Access Control" muss dafür noch geprüft
werden.

### 9.3.4 Typ „Hierarchie" (Hierarchy)

**Was:** Die Kriterien sind Hierarchieknoten. **Wirkung:** Ein Benutzer
sieht die Datensätze zu den für ihn hinterlegten Knoten und zu allen
untergeordneten Knoten (Nachfahren). **Wofür:** Organisationsstrukturen,
Kostenstellen- oder Kontenhierarchien. **Voraussetzung:** Ein View mit
Hierarchie, z. B. Eltern-Kind-Struktur (siehe Kapitel 6). **Wichtig:**
Die Spalte mit den Benutzer-IDs muss als Kennungsspalte gewählt werden.
Ist ein Benutzer in der Berechtigungsentität mit keiner Kennung
verknüpft, sieht er im geschützten View keine Datensätze.

### 9.3.5 Import von SAP-BW-Analyseberechtigungen ⚠ abhängig von Lizenz/Freischaltung

**Was:** Bestehende Analyseberechtigungen aus SAP BW bzw. SAP BW∕4HANA
werden übernommen. **Ablauf:** Der Assistent *Import Permissions*

171. importiert die Berechtigungstabelle aus dem Quellsystem,

172. legt zusätzliche Objekte an, die die Berechtigungen berechnen,

173. weist jedem ausgewählten Objekt eine Datenzugriffskontrolle zu.

**Voraussetzungen:** Eine Verbindung zum BW-System (siehe Kapitel 5) und
importierte BW-Objekte. Welche BW-Releases und Verbindungstypen
unterstützt werden, ist nicht verifiziert.

**Hinweis:** SAP beschreibt in einer Wissensdatenbank-Notiz Fälle, in
denen das Berechtigungsskript (*\_P*) bei Remote-Datenzugriffskontrollen
mit SAP BW∕4HANA keine Daten liefert. Die Berechtigungen im Quellsystem
sollten deshalb vor dem Import geprüft werden.

### 9.3.6 Zuweisung an Views

Datenzugriffskontrollen werden in **grafischen Views und SQL-Views**
zugewiesen. Einem View können eine oder mehrere Datenzugriffskontrollen
zugewiesen werden. Dabei verknüpft man die Kriterienspalten der
Datenzugriffskontrolle mit passenden Spalten des Views.

Nach der Bereitstellung (*Deploy*) sehen Benutzer im View, in
nachgelagerten Views und beim Verbrauch über Analysewerkzeuge nur noch
die für sie freigegebenen Datensätze (siehe Kapitel 12).

### 9.3.7 Abhängigkeiten und Grenzen

-   **Persistenz:** Je nachdem, wo eine Datenzugriffskontrolle sitzt,
    kann sie das Persistieren eines Views verhindern. Laut
    SAP-Wissensdatenbank lässt sich ein View nicht persistieren, wenn er
    einen View mit Datenzugriffskontrolle verwendet. Siehe dazu das
    Hilfethema „Persisted Views and Data Access Control" und Kapitel 10.

-   **Analytische Modelle:** Enthält ein analytisches Modell Standard-,
    Stichtags- (*Reference Date*) oder X-Variablen, kann eine
    Datenzugriffskontrolle keinem Dimensionsattribut zugeordnet werden
    (siehe Kapitel 6).

-   **Ohne Zuordnung keine Daten:** Ohne Eintrag in der
    Berechtigungsentität sieht ein Benutzer im geschützten View nichts
    (für den Typ „Hierarchie" belegt).

-   **Rollen ersetzen keine DAC:** Rollen und Privilegien regeln den
    Zugriff auf Funktionen und Objekte. Welche Zeilen ein Benutzer
    sieht, regelt allein die Datenzugriffskontrolle.

## 9.4 Berechtigungsmatrix (Privileges by App, Tool, Object, and Task)

Privilegien stehen für Bereiche der Anwendung, z. B. *Space Management*
oder *Business Builder*, und für die dort angelegten Objekte. Die
Standardrollen enthalten jeweils passende Sätze von Privilegien und
Berechtigungen. Grundlagen zu Rollen stehen in Kapitel 3.

Welche Privilegien man für einzelne Apps, Werkzeuge, Objekte und
Aufgaben braucht, zeigt die Hilfeseite „Privileges by App, Tool, Object,
and Task". Sie dient als Nachschlagematrix, wenn eigene Rollen (*Custom
Roles*) oder bereichsbezogene Rollen (*Scoped Roles*) erstellt werden.
Belegtes Beispiel: Für die View-Analyse (*View Analyzer*) sieht man alle
Entitäten nur mit der globalen Rolle *DW Administrator* oder mit einer
eigenen Rolle, die das Privileg *Data Warehouse Runtime* (*Read*)
enthält.

Die folgende Tabelle fasst die sicherheitsrelevanten Einträge zusammen.
Nicht belegte Zuordnungen sind entsprechend gekennzeichnet.

  ---------------------------------------------------------------------------
  **App/Werkzeug**        **Aufgabe**                 **Benötigtes Privileg
                                                      bzw. benötigte Rolle**
  ----------------------- --------------------------- -----------------------
  Datenbaustein           Datenzugriffskontrolle      *Data Access Control*
                          anlegen, ändern, löschen    (CRUD), bereichsbezogen
                                                      -- nicht verifiziert

  Datenbaustein           Datenzugriffskontrolle      Änderungsrecht für
                          einem View zuweisen         Data-Builder-Objekte im
                                                      Bereich -- nicht
                                                      verifiziert

  Datenbaustein           BW-Berechtigungen           Wie oben, zusätzlich
                          importieren                 Zugriff auf die
                                                      Verbindung -- nicht
                                                      verifiziert

  *Space Management*      Audit-Protokolle des        Bereichsadministrator
                          Bereichs aktivieren         (belegt)

  Administration          Audit-Protokolle aller      Administrator (belegt)
                          Bereiche ansehen und        
                          löschen                     

  View-Analyse            Alle Entitäten einsehen     *DW Administrator* oder
                                                      *Data Warehouse
                                                      Runtime* (*Read*)
                                                      (belegt)

  Administration          Datenbank-Analysebenutzer   Administrator --
                          anlegen                     Privileg nicht
                                                      verifiziert
  ---------------------------------------------------------------------------

## 9.5 Audit-Protokollierung (Audit Logging)

### 9.5.1 Zweck

Mit der Audit-Protokollierung lässt sich nachvollziehen, wer Daten eines
Bereichs gelesen oder geändert hat. Das unterstützt
Revisionsanforderungen und kann bei Planungsszenarien auch zur Analyse
und Wiederherstellung von Änderungen dienen.

### 9.5.2 Funktionen

-   **Lese- und Änderungs-Audit je Bereich:** Bereichsadministratoren
    aktivieren die Protokollierung unter *Space Management* → *Edit
    Space* → *Auditing*. Dazu dienen die Optionen *Enable Audit Log for
    Read Operations* und *Enable Audit Log for Change Operations*.

-   **Aufbewahrungsdauer:** Für jede Richtlinie (Lesen bzw. Ändern) wird
    eine Aufbewahrungsdauer in Tagen festgelegt.

-   **Audit für Datenbankbenutzer:** Für einzelne Datenbankbenutzer mit
    Open-SQL-Schema lassen sich ebenfalls Lese- und Änderungsprotokolle
    mit eigener Aufbewahrungsdauer aktivieren.

-   **Zentrale Übersicht:** Administratoren sehen die Audit-Protokolle
    aller Bereiche und können sie löschen, z. B. um Speicherplatz
    freizugeben.

-   **Auswertung:** Dafür wird ein Bereich vorbereitet und als
    Audit-Bereich festgelegt. Die Protokolleinträge lassen sich dann in
    Views des Datenbausteins auswerten. Die Überwachung ist in Kapitel
    10 beschrieben.

### 9.5.3 Wichtige Hinweise

-   Wird eine Audit-Richtlinie für einen Bereich oder einen
    Datenbankbenutzer deaktiviert, **werden alle zugehörigen
    Protokolleinträge gelöscht**.

-   Wer die Einträge eines Bereichs behalten will, muss sie **vor dem
    Löschen des Bereichs exportieren**.

-   Audit-Protokolle belegen Speicher. Die Aufbewahrungsdauer sollte
    deshalb an Revisionspflichten und an die Kapazität des Mandanten
    angepasst werden.

## 9.6 Sicherheit von Datenbankbenutzern

Datenbankbenutzer werden in Kapitel 4 angelegt. Sicherheitsrelevant sind
folgende Punkte:

-   **Kennwortrichtlinie:** Für Datenbankbenutzer kann eine
    Kennwortrichtlinie festgelegt werden, mit Anforderungen an die
    Komplexität, Ablauffristen und Einschränkungen bei der
    Wiederverwendung.

-   **Schreibzugriff:** Ist im Dialog *Edit Privileges* die Option
    *Enable Write Access (SQL, DDL, DML)* gesetzt, kann der Benutzer mit
    externen Werkzeugen Objekte in seinem Open-SQL-Schema anlegen und
    Daten schreiben. Diese Option sollte nur gezielt vergeben werden.

-   **Rechte zwischen Schema und Bereich:** Rechte wie INSERT, UPDATE
    oder DELETE auf Objekte des Open-SQL-Schemas erhält der Bereich über
    eine gespeicherte Prozedur. Diese wird in der SQL-Konsole des SAP
    HANA Database Explorer aufgerufen (*Database Access* → *Database
    Users* → *Open Database Explorer*).

-   **Datenbank-Analysebenutzer** (*Database Analysis User*):

-   Sie haben Lesezugriff auf alle Bereichsschemas.

-   Alle ihre Aktivitäten werden in Audit-Protokollen erfasst.

-   Sie sind nur für Analyse, Tracing und Fehlersuche bei konkreten
    Datenbankproblemen gedacht und sollten danach wieder gelöscht
    werden. Diese Empfehlung ist nicht verifiziert.

-   **Audit:** Für Datenbankbenutzer können Lese- und Änderungs-Audit
    aktiviert werden (siehe 9.5.2).

## 9.7 Datenschutz (Data Protection and Privacy)

SAP stellt Funktionen bereit, mit denen Kunden ihre eigenen Sicherheits-
und Datenschutzkonzepte umsetzen können. Diese sind im *SAP Datasphere
Security Guide* beschrieben. Die Verantwortung für die Einhaltung der
geltenden Datenschutzgesetze bleibt beim Kunden.

Die in diesem Kapitel beschriebenen Funktionen unterstützen den
Datenschutz:

-   Zeilenbeschränkung durch Datenzugriffskontrollen (9.3),

-   Protokollierung von Lesezugriffen, auch auf personenbezogene Daten
    (9.5),

-   Trennung nach Bereichen (siehe Kapitel 4),

-   Verschlüsselung (9.8).

Die SAP-Sicherheitsleitfäden nennen allgemein Funktionen wie das
vereinfachte Sperren und Löschen personenbezogener Daten. Ob und wie das
in SAP Datasphere konkret umgesetzt ist (z. B. Löschfristen, Auskunft),
ist **nicht verifiziert**.

## 9.8 Verschlüsselung ruhender Daten und kundenverwaltete Schlüssel ⚠ abhängig von Lizenz/Freischaltung

Ruhende Daten werden verschlüsselt. Wer den Zugriff auf die
SAP-Datasphere-Datenbank oder den Objektspeicher (*Object Store*) selbst
kontrollieren will, kann mit dem **SAP Key Management Service (KMS)**
einen kundenverwalteten Schlüssel anlegen. Anschließend beauftragt man
SAP, die Datenbank bzw. den Objektspeicher mit diesem Schlüssel zu
verschlüsseln.

Nicht verifiziert sind:

-   die Voraussetzungen (Lizenz, Hyperscaler, Region),

-   das Verhalten beim Widerruf des Schlüssels,

-   die Ausfallzeiten während der Umstellung.

## 9.9 Typische Abläufe

**Ablauf A -- Datenzugriffskontrolle vom Typ „Einzelwerte" anlegen und
zuweisen**

174. Im Datenbaustein eine Berechtigungsentität (Tabelle oder View) mit
     einer Spalte für die Benutzer-ID und den Kriterienspalten anlegen
     und befüllen.

175. Bei getrennter Pflege die Entität für den Modellierungsbereich
     freigeben.

176. Im Datenbaustein eine neue Datenzugriffskontrolle anlegen und die
     Berechtigungsentität auswählen.

177. Als Kriterientyp *Single Values* wählen, die Kennungsspalte und die
     Kriterienspalte(n) festlegen, speichern und bereitstellen.

178. Den gewünschten grafischen View oder SQL-View öffnen, die
     Datenzugriffskontrolle zuweisen und die Spalten verknüpfen.

179. Den View bereitstellen und in der Datenvorschau mit einem
     Testbenutzer prüfen.

**Ablauf B -- Hierarchie-Datenzugriffskontrolle**

180. Sicherstellen, dass ein Hierarchie-View (z. B. Eltern-Kind) mit der
     Dimension verknüpft ist.

181. In der Berechtigungsentität je Benutzer die erlaubten
     Hierarchieknoten pflegen.

182. Eine Datenzugriffskontrolle vom Typ *Hierarchy* anlegen und die
     Benutzer-ID-Spalte als Kennungsspalte wählen.

183. Die Datenzugriffskontrolle dem View zuweisen, bereitstellen und
     prüfen, ob auch untergeordnete Knoten sichtbar sind.

**Ablauf C -- BW-Analyseberechtigungen übernehmen** ⚠

184. Prüfen, ob die Verbindung zum BW-System und die BW-Objekte
     vorhanden sind.

185. Den Assistenten *Import Permissions* starten.

186. Die Quellobjekte auswählen. Der Assistent importiert die
     Berechtigungstabelle, legt die Berechnungsobjekte an und weist die
     Datenzugriffskontrollen zu.

187. Das Ergebnis mit Testbenutzern prüfen.

**Ablauf D -- Audit für einen Bereich aktivieren**

188. *Space Management* öffnen, den Bereich wählen und *Edit Space*
     aufrufen.

189. Unter *Auditing* die Optionen *Enable Audit Log for Read
     Operations* und/oder *Enable Audit Log for Change Operations*
     aktivieren.

190. Je Richtlinie die Aufbewahrungsdauer in Tagen eintragen, speichern
     und bereitstellen.

191. Die Auswertung über den Audit-Bereich einrichten (siehe Kapitel
     10).

## 9.10 Übersicht: Funktion -- Zweck -- benötigtes Privileg

  ---------------------------------------------------------------------------
  **Funktion**                **Zweck**               **Benötigtes
                                                      Privileg/Rolle**
  --------------------------- ----------------------- -----------------------
  DAC „Einzelwerte"           Zeilenfilter nach       *Data Access Control*
                              Einzelwerten            -- nicht verifiziert

  DAC „Operator und Werte"    Bedingungen mit         *Data Access Control*
                              UND/ODER                -- nicht verifiziert

  DAC „Hierarchie"            Knoten einschließlich   *Data Access Control*
                              Nachfahren              -- nicht verifiziert

  BW-Berechtigungsimport ⚠    Analyseberechtigungen   Wie oben, zusätzlich
                              wiederverwenden         Verbindung -- nicht
                                                      verifiziert

  DAC-Zuweisung an View       Schutz eines Views auf  Änderungsrecht für
                              Zeilenebene             Views im Bereich --
                                                      nicht verifiziert

  Audit je Bereich            Lese- und               Bereichsadministrator
                              Änderungsvorgänge       
                              protokollieren          

  Audit-Übersicht und Löschen Verwaltung und          Administrator
                              Speicherfreigabe        

  Kennwortrichtlinie          Sichere Anmeldung       Administrator --
  DB-Benutzer                                         Privileg nicht
                                                      verifiziert

  Datenbank-Analysebenutzer   Fehlersuche, wird       Administrator --
                              protokolliert           Privileg nicht
                                                      verifiziert

  Kundenverwalteter Schlüssel Eigene Schlüsselhoheit  Administrator und
  ⚠                                                   Auftrag an SAP
  ---------------------------------------------------------------------------
