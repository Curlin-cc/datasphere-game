# 6. Data Builder

## 6.1 Zweck und Einordnung

Im Datenbaustein (*Data Builder*) legen Modellierer Objekte an, mit
denen sie Daten in SAP Datasphere übernehmen, aufbereiten und für die
Nutzung modellieren. Nutzer mit Modellierer-Rolle führen hier Daten
zusammen und bereiten sie für SAP Analytics Cloud und andere BI-Clients
auf. Der Data Builder ist damit die zentrale Modellierungsumgebung der
technischen Schicht eines Bereichs (*Space*). Die semantische, fachliche
Schicht liegt im Business Builder (siehe Kapitel 7).

Der Data Builder arbeitet immer im Kontext eines Bereichs. Alle Objekte
gehören zu genau einem Bereich und nutzen dessen Ressourcen,
Verbindungen und Speicher (siehe Kapitel 4 und 5). Objekte anderer
Bereiche lassen sich nur verwenden, wenn sie freigegeben (*shared*)
wurden.

Im Data Builder werden folgende Objekttypen erstellt und bearbeitet:

  -----------------------------------------------------------------------
  **Objektgruppe**                    **Objekttypen**
  ----------------------------------- -----------------------------------
  Tabellen                            Lokale Tabelle (*Local Table*),
                                      Lokale Tabelle (Datei) (*Local
                                      Table (File)*), Remote-Tabelle
                                      (*Remote Table*)

  Views                               Grafische View (*Graphical View*),
                                      SQL-View (*SQL View*)

  Modelle                             Entity-Relationship-Modell
                                      (*Entity-Relationship Model*),
                                      Analysemodell (*Analytic Model*)

  Flows                               Datenfluss (*Data Flow*),
                                      Replikationsfluss (*Replication
                                      Flow*), Transformationsfluss
                                      (*Transformation Flow*)

  Orchestrierung und Abgleich         Aufgabenkette (*Task Chain*),
                                      Intelligentes Nachschlagen
                                      (*Intelligent Lookup*)
  -----------------------------------------------------------------------

Hinweis: SAP ändert die Oberfläche des Data Builder quartalsweise.
Bezeichnungen von Kacheln, Menüs und Schaltflächen können daher vom hier
beschriebenen Stand abweichen.

## 6.2 Aufruf, Navigation und Berechtigungen

### 6.2.1 Aufruf

Der Data Builder wird über den gleichnamigen Eintrag in der Seitenleiste
geöffnet (Aufbau der Seitenleiste siehe Kapitel 2). Ist der Nutzer
Mitglied mehrerer Bereiche, wählt er beim ersten Aufruf zunächst einen
Bereich aus. Danach erscheint die Startseite des Data Builder für diesen
Bereich. Über die Bereichsauswahl im Kopf der Startseite lässt sich
jederzeit in einen anderen Bereich wechseln.

### 6.2.2 Benötigte Rollen und Privilegien

Damit der Data Builder in der Seitenleiste erscheint und genutzt werden
kann, braucht der Nutzer

-   eine Rolle mit dem Privileg *Data Warehouse Data Builder* (Anlegen,
    Lesen, Ändern, Löschen von Data-Builder-Objekten) und

-   die Mitgliedschaft in mindestens einem Bereich.

SAP liefert dafür die Standardrolle *DW Modeler* bzw. die entsprechende
bereichsbezogene Rolle (*scoped role*) aus. Für einzelne Funktionen sind
weitere Privilegien nötig:

-   Ausführen und Einplanen von Flows und Aufgabenketten: *Data
    Integration*,

-   Anlegen von Datenzugriffskontrollen: *Data Warehouse Data Access
    Control*.

Das Rollen- und Berechtigungskonzept ist in Kapitel 3 beschrieben, die
Datenzugriffskontrollen in Kapitel 9. Die genauen
Privilegienbezeichnungen und CRUD-Stufen je Funktion sind gegen die
aktuelle Privilegienliste abzugleichen (nicht verifiziert).

## 6.3 Aufbau der Oberfläche

### 6.3.1 Startseite und Objektliste

Die Startseite des Data Builder hat drei Bereiche:

81. **Kopfbereich mit Bereichsauswahl:** Zeigt den aktuellen Bereich und
    erlaubt den Wechsel in einen anderen.

82. **Kacheln bzw. Menü zum Anlegen neuer Objekte:** Für jeden Objekttyp
    gibt es einen Einstieg, etwa *New Graphical View*, *New SQL View*,
    *New Entity-Relationship Model*, *New Data Flow*, *New Replication
    Flow*, *New Transformation Flow*, *New Task Chain*, *New Intelligent
    Lookup*, *New Analytic Model* sowie *New Local Table*. Ergänzend
    gibt es ein Importmenü (*Import*), u. a. mit *Import CSV File*,
    *Import Objects from CSN/JSON File*, *Import Remote Tables* und dem
    Assistenten *Import Entities* für semantisch angereicherte Objekte
    aus SAP S/4HANA. Der genaue Kachelsatz hängt vom Release ab und
    davon, ob es sich um einen Standard- oder einen Dateibereich (*file
    space*) handelt (nicht verifiziert).

83. **Objektliste:** Tabellarische Übersicht aller Objekte des Bereichs,
    ggf. auf Registerkarten bzw. Filter nach Objektgruppen verteilt
    (Tabellen, Views, Flows usw.).

Typische Spalten der Objektliste:

  -----------------------------------------------------------------------
  **Spalte**                          **Inhalt**
  ----------------------------------- -----------------------------------
  Geschäftsname (*Business Name*)     Sprechender, frei änderbarer Name

  Technischer Name (*Technical Name*) Eindeutiger, nach dem Speichern
                                      nicht mehr änderbarer Name

  Typ (*Type*)                        Objekttyp, z. B. *Local Table*,
                                      *View*, *Data Flow*

  Semantische Verwendung (*Semantic   z\. B. *Fact*, *Dimension*, *Text*
  Usage*)                             (siehe 6.5.3)

  Status (*Status*)                   Bereitstellungsstatus (siehe 6.3.3)

  Geändert von/am (*Changed By/On*),  Änderungshistorie
  Bereitgestellt am (*Deployed On*)   

  Freigabe (*Sharing*)                Ob das Objekt für andere Bereiche
                                      freigegeben ist
  -----------------------------------------------------------------------

Weitere Funktionen der Objektliste:

-   Suche über Freitext

-   Filter nach Typ, Status und semantischer Verwendung

-   Sortierung und Spaltenauswahl

-   Mehrfachauswahl für Sammelaktionen, z. B. Bereitstellen (*Deploy*),
    Löschen (*Delete*), Freigeben (*Share*), Exportieren als CSN/JSON

-   Doppelklick öffnet das Objekt im passenden Editor

Welche Spalten genau zur Verfügung stehen, ist am aktuellen Release zu
prüfen (nicht verifiziert).

### 6.3.2 Gemeinsamer Editoraufbau

Alle Data-Builder-Editoren sind nach demselben Muster aufgebaut:

-   **Werkzeugleiste (\*Toolbar\*)** am oberen Rand mit den Gruppen

-   Allgemein: Speichern (*Save*), Speichern unter (*Save As*),
    Bereitstellen (*Deploy*), Rückgängig/Wiederholen,

-   Bearbeiten: Hinzufügen und Entfernen von Knoten,

-   Werkzeuge (*Tools*): Validieren, Analyse der Auswirkungen und
    Herkunft (*Impact and Lineage Analysis*), Datenvorschau bzw.
    Datenanzeige (*Data Viewer*),

-   Ansicht: ein- und ausblendbare Bereiche,

-   bei Flows zusätzlich: Ausführen (*Run*) und Einplanen (*Schedule*).

-   **Quellenbrowser (\*Source Browser\*)** links, bei grafischen
    Editoren mit den Registerkarten Repository (Objekte des Bereichs und
    freigegebene Objekte) und Quellen (*Sources*, Verbindungen des
    Bereichs). Objekte werden per Drag & Drop auf die Arbeitsfläche
    gezogen.

-   **Arbeitsfläche (\*Canvas\*)** in der Mitte. Sie zeigt das Modell
    grafisch als Knoten und Kanten oder -- bei SQL-Views -- als
    Code-Editor.

-   **Eigenschaftsbereich (\*Properties Panel\*)** rechts mit den
    Einstellungen des gewählten Knotens bzw. des Gesamtobjekts. Er ist
    in Abschnitte gegliedert, z. B.

-   Allgemein (*General*),

-   Attribute bzw. Spalten (*Attributes/Columns*),

-   Assoziationen (*Associations*),

-   Eingabeparameter (*Input Parameters*),

-   Datenzugriffskontrollen (*Data Access Controls*),

-   Persistenz (*Persistency*),

-   abhängige Objekte (*Dependent Objects*),

-   Status.

-   **Datenvorschau-Bereich** unten, der sich bei Bedarf öffnet (siehe
    6.11.1).

### 6.3.3 Speichern, Bereitstellen und Objektstatus

Beim **Speichern** wird nur die Definition zur Entwurfszeit (*design
time*) im Repository abgelegt. Erst durch das **Bereitstellen
(\*Deploy\*)** entstehen die zugehörigen Laufzeitobjekte in der
SAP-HANA-Cloud-Datenbank des Bereichs. Erst dann kann das Objekt
verwendet, befüllt oder konsumiert werden.

Mögliche Statuswerte (Bezeichnungen nicht abschließend verifiziert):

  -----------------------------------------------------------------------
  **Status**                          **Bedeutung**
  ----------------------------------- -----------------------------------
  Nicht bereitgestellt (*Not          Nur gespeichert, keine
  Deployed*)                          Laufzeitobjekte vorhanden

  Bereitgestellt (*Deployed*)         Entwurfs- und Laufzeitstand stimmen
                                      überein

  Änderungen bereitzustellen          Gespeicherte Änderungen sind noch
  (*Changes to Deploy*)               nicht bereitgestellt

  Entwurfszeitfehler (*Design-Time    Die Definition ist fehlerhaft, z.
  Error*)                             B. nach Änderung einer Quelle

  Laufzeitfehler (*Run-Time Error*)   Das Laufzeitobjekt ist fehlerhaft
  -----------------------------------------------------------------------

Hinweise:

-   Wird eine Quelle geändert, kann das abhängige Objekte betreffen. Vor
    dem Bereitstellen sollte deshalb die Auswirkungsanalyse (siehe
    6.11.2) genutzt werden.

-   Den Transport bereitgestellter Objekte in andere Mandanten
    beschreibt Kapitel 11.

## 6.4 Tabellen

### 6.4.1 Lokale Tabellen

**Was:** Eine lokale Tabelle (*Local Table*) ist eine Datenbanktabelle
im Speicher des Bereichs. Sie dient als Ziel von Flows, als Ablage für
manuell gepflegte oder hochgeladene Daten und als Quelle für Views.

**Anlage:** Es gibt vier Wege:

-   über *New Local Table*,

-   aus einem ER-Modell,

-   durch CSV-Import (siehe 6.11.3),

-   automatisch als Zieltabelle eines Flows.

**Wichtigste Einstellungen im Tabelleneditor:**

-   Geschäftsname, technischer Name und semantische Verwendung (siehe
    6.5.3).

-   Spaltendefinition: Name, Datentyp, Länge/Genauigkeit,
    Schlüsselkennzeichen (*Key*), Nicht-Null, Standardwert und
    semantischer Typ der Spalte (z. B. Betrag mit Währung, Menge mit
    Einheit, Text, Datum). Bei Tabellen mit semantischer Verwendung
    *Fact* oder *Dimension* werden Spalten als Kennzahl (*Measure*) oder
    Attribut eingestuft.

-   Assoziationen zu anderen Entitäten (siehe 6.5.4).

-   Option „Für Nutzung freigeben" (*Expose for Consumption*), damit die
    Tabelle direkt von Clients konsumiert werden kann (Details siehe
    Kapitel 12).

-   Speicher- und Tabellendienste, z. B. In-Memory-Speicher, sowie
    Partitionierung (Umfang nicht verifiziert).

-   Dateneditor (*Data Editor*): Datensätze direkt in der Oberfläche
    anlegen, ändern oder löschen.

-   Daten aus einer CSV-Datei laden (*Upload Data from CSV File*). Mit
    der Option „Vorhandene Daten vor dem Upload löschen" (*Delete
    Existing Data Before Upload*) wird der Bestand vorher entfernt. Ohne
    diese Option werden Datensätze nur eingefügt.

### 6.4.2 Delta-Erfassung (Delta Capture)

Mit dem Schalter Delta-Erfassung (*Delta Capture*) zeichnet eine lokale
Tabelle Änderungen auf, die nach ihrer Bereitstellung vorgenommen
werden. Das ist nötig, wenn nachgelagerte Prozesse, etwa
Transformationsflüsse mit Delta-Ladung, nur Änderungen verarbeiten
sollen.

Wirkung:

-   Das System legt eine interne Delta-Tabelle mit dem Suffix \_Delta
    an. Sie enthält die technischen Spalten Änderungsart (*Change Type*)
    und Änderungsdatum (*Change Date*).

-   Für Abfragen steht die Sicht auf die aktiven Datensätze (*Active
    Records*) bereit.

-   Die Delta-Tabelle kann nicht direkt in einer SQL-View abgefragt
    werden. Das ist eine dokumentierte Einschränkung.

-   Die Delta-Erfassung lässt sich bei bereits befüllten Tabellen nur
    eingeschränkt nachträglich ein- oder ausschalten (nicht
    verifiziert).

### 6.4.3 Lokale Tabellen (Datei)

⚠ abhängig von Lizenz/Freischaltung: In Dateibereichen (*file spaces*),
die auf dem Objektspeicher (SAP HANA Cloud, Data Lake Files) basieren,
gibt es den Typ Lokale Tabelle (Datei) (*Local Table (File)*). Diese
Tabellen

-   speichern Daten im Objektspeicher statt im In-Memory-Speicher,

-   haben eine eigene Variante der Delta-Erfassung,

-   werden über Replikations- und Transformationsflüsse befüllt.

Über Pufferstufen und Wartungsaufgaben wie Zusammenführen (*Merge*) und
Optimieren (*Optimize*) werden die Daten in die aktive Tabelle
überführt. Die Verfügbarkeit hängt von der Mandantenkonfiguration ab
(siehe Kapitel 3 und 4). Die Details sind nicht verifiziert.

### 6.4.4 Remote-Tabellen

**Was:** Eine Remote-Tabelle (*Remote Table*) bildet eine Quelltabelle
bzw. ein Quellobjekt einer Verbindung (siehe Kapitel 5) im Bereich ab,
ohne die Daten zunächst zu kopieren.

**Anlage:** Über *Import Remote Tables* oder per Drag & Drop eines
Quellobjekts aus dem Quellenbrowser in eine View oder ein ER-Modell.

**Optionen:**

-   Spalten ausblenden bzw. entfernen, um die übertragene Datenmenge zu
    verringern.

-   Filter definieren (bei Replikation).

-   Datenzugriff wählen:

-   föderiert/remote: Abfrage zur Laufzeit an der Quelle,

-   Snapshot-Replikation,

-   Echtzeitreplikation (nur bei geeigneten Quellen und
    Verbindungstypen).

-   Semantische Verwendung und Spaltenmetadaten anpassen.

Den Wechsel des Datenzugriffs, das Laden von Snapshots und das Einplanen
steuert man im Data Integration Monitor (siehe Kapitel 10).

## 6.5 Views und modellierende Querschnittsfunktionen

### 6.5.1 Grafische Views

**Was:** Eine grafische View (*Graphical View*) beschreibt eine Abfrage
über ein Datenflussdiagramm auf der Arbeitsfläche. Sie ist das
Standardwerkzeug, um Daten ohne Code zu kombinieren, zu filtern und
anzureichern.

**Aufbau:** Quellenbrowser, Arbeitsfläche mit Quell-, Operator- und
Ausgabeknoten (*Output*) sowie Eigenschaftsbereich. Wird ein Knoten
ausgewählt, erscheinen kontextbezogene Symbole zum Anfügen weiterer
Operatoren.

**Operatoren (Knotentypen):**

  -----------------------------------------------------------------------
  **Operator**                        **Zweck**
  ----------------------------------- -----------------------------------
  Join                                Zwei Quellen über Join-Bedingungen
                                      verbinden (Inner, Left Outer, Right
                                      Outer, Full Outer, Cross).
                                      Spaltenzuordnung per Drag & Drop.

  Union                               Gleich strukturierte Quellen
                                      untereinander zusammenführen, mit
                                      Spaltenzuordnung

  Projektion (*Projection*)           Spalten auswählen, ausschließen und
                                      umbenennen

  Filter                              Zeilen über einen Ausdruck
                                      einschränken (Ausdruckseditor mit
                                      Funktionen)

  Berechnete Spalten (*Calculated     Neue Spalten über Ausdrücke
  Columns*)                           berechnen

  Aggregation                         Gruppieren und aggregieren (SUM,
                                      MIN, MAX, COUNT usw.)
  -----------------------------------------------------------------------

Ausgabeknoten (Eigenschaftsbereich):

-   Geschäfts- und technischer Name

-   semantische Verwendung

-   *Expose for Consumption*

-   analytischer Modus (*Run in Analytical Mode*, nicht verifiziert)

-   Attribute und Kennzahlen

-   Assoziationen, Eingabeparameter, Datenzugriffskontrollen

-   Persistenz

-   abhängige Objekte

**Validierung:** Fehler und Warnungen werden am Knoten und in einer
Meldungsliste angezeigt. Ändert sich die Struktur einer Quelle, erkennt
der Editor das und bietet an, die Spalten zu übernehmen.

### 6.5.2 SQL-Views (SQL und SQLScript)

**Was:** Eine SQL-View (*SQL View*) wird in einem Code-Editor
geschrieben. Zur Wahl stehen zwei Sprachen:

-   **SQL (Standardabfrage):** genau eine SELECT-Anweisung im
    SAP-HANA-SQL-Dialekt.

-   **SQLScript (Tabellenfunktion):** eine Prozedurlogik mit Variablen,
    Zwischenergebnissen und RETURN. Sie wird als Tabellenfunktion
    bereitgestellt.

**Funktionen:**

-   Syntaxhervorhebung und Autovervollständigung von Objekt- und
    Spaltennamen

-   Einfügen von Objekten per Drag & Drop aus dem Quellenbrowser

-   Validieren (*Validate*), um die Ausgabespalten abzuleiten

-   Eigenschaftsbereich wie bei grafischen Views: semantische
    Verwendung, Assoziationen, Eingabeparameter,
    Datenzugriffskontrollen, Persistenz

**Einschränkungen:**

-   Nur Objekte des eigenen Bereichs und freigegebene Objekte sind
    referenzierbar.

-   Ausdrücke müssen mit der View-Laufzeit vereinbar sein, z. B. keine
    DML-Anweisungen.

-   In SQLScript gelten die von SAP dokumentierten Beschränkungen
    erlaubter Anweisungen (die Detailliste ist nicht verifiziert).

### 6.5.3 Semantische Verwendung (Semantic Usage)

Die semantische Verwendung legt bei Tabellen und Views fest, welche
analytische Rolle eine Entität spielt. Sie bestimmt, welche Abschnitte
im Eigenschaftsbereich angeboten werden und wie Analysemodell und
Business Builder die Entität nutzen können.

  -----------------------------------------------------------------------
  **Semantische Verwendung**          **Bedeutung**
  ----------------------------------- -----------------------------------
  Relationaler Datensatz (*Relational Spalten ohne besonderen
  Dataset*)                           analytischen Zweck (Standardwert)

  Fakt (*Fact*)                       Enthält eine oder mehrere
                                      Kennzahlen; Quelle für
                                      Analysemodelle

  Dimension (*Dimension*)             Stammdaten mit Attributen, an
                                      Fakten assoziierbar

  Text (*Text*)                       Sprachabhängige Bezeichnungen zu
                                      Schlüsseln (Sprachspalte,
                                      Textspalten)

  Hierarchie (*Hierarchy*)            Eltern-Kind-Hierarchie zu einer
                                      Dimension

  Hierarchie mit Verzeichnis          Mehrere Hierarchien mit
  (*Hierarchy with Directory*)        Verzeichnis-Entität; eigene
                                      Pflicht-Attribute und Einstellungen

  Analytischer Datensatz (*Analytical Älterer Typ für die direkte
  Dataset*)                           analytische Nutzung; von SAP
                                      zugunsten von *Fact* plus
                                      Analysemodell zurückgestuft (Status
                                      nicht verifiziert)
  -----------------------------------------------------------------------

Neben der Verwendung der Entität vergibt man je Spalte semantische
Typen, z. B. Betrag mit Währung, Menge mit Einheit, Währungscode,
Einheit, Text, Geschäftsdatum oder Geolocation. Diese Typen steuern die
Darstellung und die Umrechnungsfunktionen in den Clients.

### 6.5.4 Assoziationen

Assoziationen (*Associations*) sind semantische Beziehungen zwischen
Entitäten. Sie wirken erst bei der Nutzung als Join und werden im
Abschnitt *Associations* einer Tabelle oder View bzw. grafisch im
ER-Modell angelegt. Jede Assoziation hat

-   ein Ziel (*Target*),

-   eine Kardinalität und

-   eine Schlüsselzuordnung (Quellspalte → Zielspalte).

Typische Arten:

-   **Fakt → Dimension:** Das Analysemodell bietet die Dimension als
    auswählbare Dimension an.

-   **Dimension/Spalte → Text:** Texte werden sprachabhängig zu
    Schlüsselwerten angezeigt.

-   **Dimension → Hierarchie bzw. Hierarchie mit Verzeichnis:** Die
    Dimension wird hierarchisch dargestellt.

Assoziationen werden in nachgelagerte Views übernommen, sofern die
zugrunde liegenden Spalten erhalten bleiben (Bedingungen nicht
verifiziert).

### 6.5.5 Eingabeparameter

Eingabeparameter (*Input Parameters*) sind Platzhalter, die beim Lesen
der View mit Werten belegt werden. Sie werden im Eigenschaftsbereich
einer View definiert: Name, Datentyp, Standardwert. Verwendet werden sie
in Filterausdrücken, berechneten Spalten oder SQL-Code.

Konsumierende Objekte müssen Werte für die Parameter liefern, z. B. eine
darüberliegende View durch Parameterzuordnung oder ein Analysemodell
durch eine Variable. Für persistierte Views gelten Einschränkungen: Eine
View mit Eingabeparametern ist nur persistierbar, wenn für die Parameter
Standardwerte festgelegt sind (nicht verifiziert).

### 6.5.6 Persistenz

Views werden standardmäßig virtuell zur Abfragezeit berechnet. Über den
Abschnitt Persistenz (*Persistency*) einer bereitgestellten View lässt
sich das Ergebnis als Snapshot in einer Tabelle speichern. Das
verbessert die Laufzeit, kostet aber Speicher.

Funktionen:

-   Daten persistieren und aktualisieren

-   Snapshot entfernen

-   Ausführung einplanen

-   Status prüfen

Im Detail gesteuert und überwacht wird die View-Persistenz im Data
Integration Monitor (siehe Kapitel 10). Persistenz ist auch als Aufgabe
in Aufgabenketten einsetzbar (siehe 6.8).

### 6.5.7 Datenzugriffskontrollen zuweisen

Im Abschnitt Datenzugriffskontrollen (*Data Access Controls*) einer
Tabelle oder View werden bereits angelegte Datenzugriffskontrollen
zugewiesen. Dazu werden die Kriterien der Kontrolle den Spalten der View
zugeordnet. So wird zeilenbasiert festgelegt, welche Nutzer welche
Datensätze sehen.

Anlage, Arten und Wirkungsweise der Datenzugriffskontrollen beschreibt
Kapitel 9. Analysemodelle übernehmen die Kontrollen der zugrunde
liegenden Entitäten.

## 6.6 Entity-Relationship-Modelle

**Was:** Ein Entity-Relationship-Modell (*Entity-Relationship Model*,
ER-Modell) ist eine Entwurfsansicht, in der mehrere Tabellen und Views
mit ihren Assoziationen grafisch angeordnet werden. Das ER-Modell selbst
hat keine eigene Laufzeit. Es ist ein Container für die Darstellung und
für Sammelaktionen.

**Funktionen:**

-   Vorhandene Tabellen und Views aus dem Repository sowie
    Remote-Tabellen aus dem Quellenbrowser hinzufügen

-   Neue Tabellen und Views direkt auf der Arbeitsfläche anlegen

-   Assoziationen zeichnen, indem eine Verbindung von einer Entität zur
    anderen gezogen wird; Schlüsselzuordnung im Eigenschaftsbereich

-   Verwandte Entitäten hinzufügen, d. h. assoziierte Objekte
    automatisch einblenden (Funktionsbezeichnung nicht verifiziert)

-   Import von Objekten aus CSN/JSON-Dateien direkt in das Modell (siehe
    6.11.3)

-   Gesamtes Modell samt enthaltener Objekte speichern und bereitstellen

-   Export als CSN/JSON

**Hinweis:** Wird ein Objekt aus dem ER-Modell entfernt, bleibt es im
Repository erhalten. Gelöscht wird es nur über die Objektliste oder
ausdrücklich im Modell (Verhalten nicht verifiziert).

## 6.7 Flows

### 6.7.1 Datenfluss (Data Flow)

**Was:** Ein Datenfluss (*Data Flow*) ist ein ETL-Prozess. Er liest
Daten aus einer oder mehreren Quellen, transformiert sie mit Operatoren
und schreibt sie in eine Zieltabelle.

**Aufbau:** Arbeitsfläche mit Quellknoten (Tabellen, Views oder
Quellobjekte von Verbindungen), Operatoren und genau einem bzw. mehreren
Zielknoten (*Target*). Der Eigenschaftsbereich zeigt je Knoten Spalten,
Zuordnungen und Optionen.

**Operatoren:**

  -----------------------------------------------------------------------
  **Operator**                        **Zweck**
  ----------------------------------- -----------------------------------
  Join                                Zwei Eingänge verbinden

  Union                               Eingänge zusammenführen

  Projektion (*Projection*)           Spalten auswählen, umbenennen,
                                      berechnen, filtern

  Aggregation                         Gruppieren und aggregieren

  Skript (*Script*)                   Transformation per Python (siehe
                                      unten)
  -----------------------------------------------------------------------

**Skriptoperator:** Er erhält die Daten des vorherigen Operators und
gibt strukturierte Daten an den nächsten weiter. Die Logik wird im
Abschnitt *Script* des Operators als Rumpf einer Funktion transform
hinterlegt. Unterstützt werden die Bibliotheken NumPy und Pandas,
verfügbar unter den Aliasen np und pd ohne ausdrücklichen Import. Nicht
erlaubt sind E/A-Operationen wie Datei- oder Netzwerkzugriff.

Das Ausgabeschema des Skriptoperators muss deklariert werden. Den
erlaubten Funktionsumfang legt die SAP-Referenz *Script Operator Python
Reference* fest.

**Zieloptionen:**

-   Modus Anhängen (*Append*), optional mit Upsert-Verhalten,

-   Modus Leeren (*Truncate*): Ziel vor dem Laden leeren,

-   Modus Löschen (*Delete*): Datensätze im Ziel anhand des Schlüssels
    löschen,

-   Spaltenzuordnung zwischen Eingang und Ziel, automatisch oder
    manuell,

-   Anlage einer neuen Zieltabelle aus dem Flow heraus.

**Ausführung:** Über *Run* in der Werkzeugleiste oder durch Einplanen.
Ein Datenfluss muss vor der Ausführung bereitgestellt sein.
Ausführungsprotokolle, Laufzeitstatus und Einplanungen stehen im Data
Integration Monitor (siehe Kapitel 10). Laufzeiteinstellungen (z. B.
Speicher oder Parallelität) sind im Eigenschaftsbereich nur
eingeschränkt verfügbar (nicht verifiziert).

### 6.7.2 Replikationsfluss (Replication Flow)

**Was:** Ein Replikationsfluss (*Replication Flow*) kopiert mehrere
Quellobjekte mit geringem Modellierungsaufwand in ein Ziel -- mit
Erstladung und optional fortlaufender Delta-Übertragung. Komplexe
Transformationen sind nicht vorgesehen. Möglich sind Projektionen, also
Filter und Spaltenzuordnungen.

**Quellen:** Verbindungen, die Replikationsflüsse unterstützen, z. B.
SAP S/4HANA (CDS-Views, ODP-Quellen, Tabellen über SLT),
SAP-ABAP-basierte Systeme, SAP HANA, SAP BW sowie ausgewählte
Cloud-Speicher und Datenbanken. Die jeweils unterstützten Quellen sind
in Kapitel 5 bzw. der Verbindungsdokumentation festgelegt.

**Ziele:**

-   SAP Datasphere selbst: lokale Tabellen bzw. lokale Tabellen (Datei),

-   weitere SAP-Ziele, z. B. SAP HANA Cloud oder SAP HANA Data Lake
    Files,

-   Nicht-SAP-Ziele wie Objektspeicher von Hyperscalern (Amazon S3,
    Google Cloud Storage, Azure Data Lake Storage Gen2), Google BigQuery
    oder Kafka/Confluent.

Die genaue Liste unterstützter Ziele ändert sich mit dem Release (nicht
verifiziert).

⚠ abhängig von Lizenz/Freischaltung: Die Replikation in Nicht-SAP-Ziele
gehört zur *Premium Outbound Integration*. SAP nennt sie den empfohlenen
Weg, um Daten aus der SAP-Umgebung herauszubewegen. Sie wird gesondert,
volumenabhängig berechnet und muss im Mandanten verfügbar sein
(Abrechnungsdetails siehe Kapitel 3; Abrechnungsmodell nicht
verifiziert).

**Ladearten (\*Load Type\*):**

  -----------------------------------------------------------------------
  **Ladeart**                         **Wirkung**
  ----------------------------------- -----------------------------------
  Nur initial (*Initial Only*)        Alle ausgewählten Daten werden
                                      einmal geladen

  Initial und Delta (*Initial and     Nach der Erstladung prüft das
  Delta*)                             System in regelmäßigen Abständen
                                      auf Quelländerungen und überträgt
                                      sie ins Ziel

  Nur Delta (*Delta Only*)            Nur Änderungen ab dem
                                      Startzeitpunkt (Verfügbarkeit je
                                      Quelle; nicht verifiziert)
  -----------------------------------------------------------------------

*Initial and Delta* setzt eine delta-fähige Quelle voraus. Bei CDS-Views
ohne Delta-Fähigkeit wird nur *Initial Only* angeboten.

**Weitere Einstellungen:**

-   Option Leeren (*Truncate*) für das Ziel

-   Delta-Ladeintervall

-   Projektionen je Replikationsobjekt: Filter, Spaltenzuordnung,
    Zusatzspalten

-   Laufzeiteinstellungen wie Anzahl paralleler Threads (nicht
    verifiziert)

Ausführung und Überwachung erfolgen über *Run* bzw. den Data Integration
Monitor (siehe Kapitel 10).

### 6.7.3 Transformationsfluss (Transformation Flow)

**Was:** Ein Transformationsfluss (*Transformation Flow*) lädt Daten aus
einer oder mehreren Quellen über eine Transformation in eine Zieltabelle
-- vollständig oder als Delta. Er ist das Mittel der Wahl, wenn
Delta-Daten aus Tabellen mit Delta-Erfassung weiterverarbeitet werden
sollen.

**Aufbau:**

-   **View-Transformation (\*View Transform\*)**, wahlweise grafisch
    (Operatoren wie in 6.5.1) oder als SQL bzw. SQLScript.

-   **Zieltabellenknoten (\*Target Table\*)**: vorhandene oder neu
    angelegte lokale Tabelle, ggf. mit Delta-Erfassung.

-   In Dateibereichen ⚠ abhängig von Lizenz/Freischaltung zusätzlich ein
    Python-Operator. Er läuft auf der Spark-basierten Laufzeit des
    Objektspeichers und unterliegt der SAP-Referenz *Python Operator
    Reference*.

**Ladearten:**

-   Nur initial (*Initial Only*)

-   Initial und Delta (*Initial and Delta*): Bei Folgeläufen werden nur
    Änderungen seit dem letzten Lauf aus delta-fähigen Quellen
    verarbeitet.

**Laufzeit:** Ausführung in SAP HANA (Standardbereich) oder auf der
Objektspeicher-Laufzeit (Dateibereich). Ausführung, Einplanung und
Monitoring wie bei Datenflüssen. Ein Rücksetzen des Delta-Zeigers ist
über den Monitor möglich (Bezeichnung nicht verifiziert).

## 6.8 Aufgabenketten (Task Chains)

**Was:** Eine Aufgabenkette (*Task Chain*) fasst mehrere Aufgaben zu
einer gemeinsam ausführbaren und einplanbaren Kette zusammen, etwa
„Remote-Tabelle replizieren → View persistieren → Transformationsfluss
ausführen".

**Mögliche Aufgaben (nicht abschließend):**

-   Replikation von Remote-Tabellen

-   Persistenz von Views

-   Datenflüsse, Transformationsflüsse und Replikationsflüsse (bei
    Replikationsflüssen in der Regel nur *Initial Only*)

-   Intelligentes Nachschlagen

-   Andere Aufgabenketten (verschachtelt)

-   Weitere Aufgabentypen wie Open-SQL-Prozeduren, API-Aufgaben,
    Prozessketten von SAP BW Bridge oder Benachrichtigungsschritte (je
    nach Release; nicht verifiziert)

**Aufbau und Optionen:**

-   Arbeitsfläche, auf der Objekte aus dem Repository per Drag & Drop
    als Schritte eingefügt werden

-   Sequenzielle Abfolge oder parallele Zweige, zusammengeführt über
    einen Operator, der wartet, bis alle (*ALL*) bzw. einer (*ANY*) der
    Vorgänger erfolgreich beendet ist

-   E-Mail-Benachrichtigung bei Abschluss oder Fehler, mit Empfängern
    aus dem Mandanten oder externen Adressen

-   Einplanung über *Schedule*; Überwachung im Data Integration Monitor,
    Bereich Aufgabenketten (siehe Kapitel 10)

Für das Ausführen der enthaltenen Aufgaben benötigt der Nutzer bzw. der
Einplanungseigentümer die entsprechenden Integrationsprivilegien.
Eingeplante Aufgaben laufen im Namen des Einplanungseigentümers. Die
Einwilligung zur Einplanung (*consent*) und die Übertragung der
Eigentümerschaft sind in Kapitel 10 beschrieben.

## 6.9 Intelligentes Nachschlagen (Intelligent Lookup)

**Was:** Das intelligente Nachschlagen (*Intelligent Lookup*) gleicht
die Datensätze einer Eingabe-Entität mit einer Nachschlage-Entität ab.
Es wird verwendet, wenn kein sauberer gemeinsamer Schlüssel existiert,
z. B. bei Kundennamen aus einer Tabellenkalkulation gegenüber
Kundenstammdaten.

**Aufbau:**

-   Eingabe-Entität (*Input*) mit eindeutiger Spalte zur Identifikation,

-   Nachschlage-Entität (*Lookup*),

-   Regelknoten (*Rule*),

-   Ausgabe-View.

**Regeln:**

-   Exakte Übereinstimmung (*Exact Match*): Spaltenpaare müssen gleich
    sein.

-   Unscharfe Übereinstimmung (*Fuzzy Match*): Ähnlichkeitsvergleich mit
    einstellbarem Schwellenwert.

Regeln lassen sich hintereinander schalten, sodass nicht zugeordnete
Datensätze an eine Folgeregel weitergegeben werden.

**Ergebniskategorien:** Zugeordnet (*Matched*), zu prüfen (*Review*),
mehrfach (*Multiple*), nicht zugeordnet (*Unmatched*), unbearbeitet
(*Unprocessed*). Zu jeder Kategorie lassen sich Ergebnisse manuell
bestätigen, ablehnen oder neu zuordnen. Die Ausgabe-View stellt die
angereicherten Daten für Views bereit.

Die Ausführung ist manuell, eingeplant oder in Aufgabenketten möglich.
Die Kategoriebezeichnungen sind gegen die aktuelle Oberfläche zu prüfen
(nicht verifiziert).

## 6.10 Analysemodell (Analytic Model)

### 6.10.1 Zweck

Das Analysemodell (*Analytic Model*) ist das analytische Konsumobjekt
des Data Builder. Es basiert auf genau einer Faktenquelle (*Fact*) und
den daran assoziierten Dimensionen. Es definiert, welche Kennzahlen,
Dimensionen, Attribute, Variablen und Filter für SAP Analytics Cloud und
andere analytische Clients sichtbar sind (Nutzung siehe Kapitel 12).

### 6.10.2 Aufbau des Editors

-   **Arbeitsfläche:** Faktenquelle in der Mitte, assoziierte
    Dimensionen als Knoten. Dimensionen werden über Assoziationen der
    Faktenquelle hinzugefügt bzw. ausgewählt.

-   **Eigenschaftsbereich:** Zeigt, je nachdem was ausgewählt ist, das
    Gesamtmodell (Kennzahlen, Attribute, Variablen, globaler Filter,
    Datenzugriff) oder einzelne Quellen (auszuwählende Kennzahlen und
    Attribute).

-   Über einen Klick auf den Hintergrund der Arbeitsfläche werden u. a.
    Variablen hinzugefügt (*Add Variable*).

-   **Datenvorschau:** Integrierte Vorschau, die das Modell so zeigt,
    wie es Nutzer in SAP Analytics Cloud sehen.

### 6.10.3 Kennzahlen

  -----------------------------------------------------------------------
  **Kennzahlart**                     **Zweck**
  ----------------------------------- -----------------------------------
  Faktenquell-Kennzahl (*Fact Source  Aus der Faktenquelle übernommen,
  Measure*)                           Aggregation konfigurierbar

  Berechnete Kennzahl (*Calculated    Formel über andere Kennzahlen
  Measure*)                           

  Eingeschränkte Kennzahl             Kennzahl, auf bestimmte
  (*Restricted Measure*)              Dimensionswerte eingeschränkt

  Eindeutige Anzahl (*Count           Anzahl unterschiedlicher Werte
  Distinct*)                          eines Attributs

  Festwert-Kennzahl (*Fixed Value*)   Konstanter Wert, z. B. für
                                      Berechnungen

  Währungs- bzw. Einheitenumrechnung  Umrechnung über Umrechnungstabellen
  (*Currency/Unit Conversion          (Voraussetzungen siehe
  Measure*)                           Dokumentation; nicht verifiziert)
  -----------------------------------------------------------------------

Je Kennzahl lassen sich Aggregationsverhalten, Ausnahmeaggregation
(nicht verifiziert), Anzeige-Skalierung und Sichtbarkeit einstellen.

Hinweis: Berechnete Kennzahlen, die von einer bestimmten Dimension
abhängen, liefern in der Vorschau nur dann Werte, wenn diese Dimension
in der Abfrage enthalten ist.

### 6.10.4 Dimensionen und Attribute

-   Dimensionen ergeben sich aus den Assoziationen der Faktenquelle
    (siehe 6.5.4). Sie können auch mehrstufig sein, also Dimensionen von
    Dimensionen.

-   Je Dimension wird festgelegt, welche Attribute sichtbar sind. Texte
    und Hierarchien werden über die Assoziationen der Dimension genutzt.

-   Attribute der Faktenquelle selbst sind ebenfalls auswählbar.

### 6.10.5 Variablen und Filter

  -----------------------------------------------------------------------
  **Variablenart**                    **Zweck**
  ----------------------------------- -----------------------------------
  Standardvariable (*Standard         Wert wird zur Laufzeit abgefragt,
  Variable*)                          z. B. für Eingabeparameter

  Filtervariable (*Filter Variable*)  Nutzerseitiger Filter auf eine
                                      Dimension (Einzelwert, Intervall,
                                      Bereich; Pflicht oder optional)

  Variable für eingeschränkte         Steuert die Einschränkung einer
  Kennzahlen (*Restricted Measure     eingeschränkten Kennzahl zur
  Variable*)                          Laufzeit

  Stichtagsvariable (*Reference Date  Steuert zeitabhängige Dimensionen
  Variable*)                          (nicht verifiziert)
  -----------------------------------------------------------------------

Eingabeparameter der Quellen werden auf Variablen abgebildet. Zusätzlich
kann ein globaler Filter definiert werden, der für alle Abfragen gilt.

### 6.10.6 Datenvorschau des Analysemodells

Die Vorschau zeigt das Modell in einer pivotartigen Tabelle. Möglich
sind

-   unterschiedliche Perspektiven, d. h. Dimensionen in Zeilen bzw.
    Spalten,

-   das Setzen von Filtern,

-   die Belegung von Variablen.

So lässt sich das Ergebnis vor der Bereitstellung bzw. Nutzung prüfen.

## 6.11 Querschnittsfunktionen

### 6.11.1 Datenvorschau (Data Preview / Data Viewer)

In Tabellen-, View- und Flow-Editoren lässt sich für den gewählten
Knoten bzw. das Objekt eine Datenvorschau öffnen. Funktionen:

-   Anzeige einer begrenzten Anzahl Zeilen

-   Spaltenauswahl, Sortierung, Filter

-   bei Views die Vorschau einzelner Zwischenknoten

-   bei Views mit Eingabeparametern die Eingabe der Parameterwerte

Voraussetzung ist in der Regel, dass die Quellen bereitgestellt bzw.
erreichbar sind. Bei föderierten Remote-Tabellen wird die Quelle live
abgefragt. Ob die Vorschau-Ergebnisse als CSV exportiert werden können,
ist nicht verifiziert.

### 6.11.2 Analyse der Auswirkungen und Herkunft (Impact and Lineage Analysis)

Über die Werkzeugleiste bzw. das Kontextmenü eines Objekts öffnet sich
ein Diagramm mit

-   den vorgelagerten Objekten (Herkunft, *Lineage*), also aus welchen
    Quellen das Objekt gespeist wird, und

-   den nachgelagerten Objekten (Auswirkung, *Impact*), also welche
    Objekte das aktuelle Objekt verwenden.

Typische Einsätze:

-   vor Strukturänderungen und Löschungen,

-   bei der Fehlersuche nach Entwurfszeitfehlern,

-   vor dem Transport (siehe Kapitel 11).

Die bereichsübergreifende Herkunftsanalyse im Katalog beschreibt Kapitel
8.

### 6.11.3 Import und Export

  -------------------------------------------------------------------------
  **Funktion**                        **Beschreibung**
  ----------------------------------- -------------------------------------
  CSV-Datei importieren (*Import CSV  Legt aus einer CSV-Datei eine neue
  File*)                              lokale Tabelle an. Ein Assistent
                                      erkennt Trennzeichen und
                                      Spaltentypen; Spalten lassen sich vor
                                      dem Bereitstellen anpassen
                                      (Bereinigungs- und
                                      Transformationsfunktionen im
                                      Importdialog nicht verifiziert).

  Daten in vorhandene Tabelle         CSV-Upload in eine bestehende lokale
  hochladen                           Tabelle (siehe 6.4.1)

  Objekte aus CSN/JSON-Datei          Von der Startseite oder aus einem
  importieren (*Import Objects from   ER-Modell. Eine CSN-Datei (*Core Data
  CSN/JSON File*)                     Services Schema Notation*) enthält
                                      nur die Strukturdefinition von
                                      Tabellen, Views und anderen Objekten,
                                      keine Daten. Im Importdialog werden
                                      die zu erstellenden Objekte
                                      ausgewählt; bestehende Objekte können
                                      ggf. überschrieben werden (Optionen
                                      nicht verifiziert).

  Export als CSN/JSON                 Ausgewählte Objekte werden als
                                      CSN/JSON-Datei exportiert, z. B. für
                                      Kopien in andere Bereiche oder
                                      Mandanten. Für den geregelten
                                      Transport siehe Kapitel 11.

  Entitäten importieren (*Import      Assistent, der aus SAP-S/4HANA-Cloud-
  Entities*)                          und
                                      SAP-S/4HANA-On-Premise-Verbindungen
                                      semantisch angereicherte Objekte lädt
                                      und Business-Builder- sowie
                                      Data-Builder-Entitäten samt
                                      Abhängigkeiten erzeugt

  Remote-Tabellen importieren         Auswahl von Quellobjekten einer
  (*Import Remote Tables*)            Verbindung zur Anlage von
                                      Remote-Tabellen
  -------------------------------------------------------------------------

### 6.11.4 Freigabe für andere Bereiche

Tabellen und Views lassen sich anderen Bereichen freigeben (*Share*).
Dort erscheinen sie im Repository des Quellenbrowsers und können als
Quelle genutzt, aber nicht geändert werden. Die Datenzugriffskontrollen
der Quelle bleiben dabei wirksam (siehe Kapitel 9).

## 6.12 Typische Abläufe

### 6.12.1 Grafische View erstellen und bereitstellen

84. In der Seitenleiste den Data Builder öffnen und den Bereich
    auswählen.

85. *New Graphical View* wählen.

86. Eine Quelltabelle aus dem Quellenbrowser (Repository oder Quellen)
    auf die Arbeitsfläche ziehen.

87. Eine zweite Quelle auf die erste ziehen, um einen Join zu erzeugen,
    und die Join-Bedingung im Eigenschaftsbereich festlegen.

88. Bei Bedarf Projektion, Filter, berechnete Spalten oder Aggregation
    anfügen.

89. Den Ausgabeknoten wählen, Namen vergeben und die semantische
    Verwendung setzen, z. B. *Fact*. Kennzahlen und Attribute festlegen.

90. Assoziationen zu Dimensionen anlegen und bei Bedarf eine
    Datenzugriffskontrolle zuweisen.

91. Die Datenvorschau prüfen.

92. Speichern und bereitstellen; den Status in der Objektliste
    kontrollieren.

### 6.12.2 Lokale Tabelle per CSV anlegen

93. Auf der Startseite *Import* \> *Import CSV File* wählen.

94. Die Datei auswählen; Trennzeichen und Kopfzeile prüfen.

95. Spaltennamen und Datentypen anpassen.

96. Die Tabelle bereitstellen und die Daten laden lassen.

### 6.12.3 Replikationsfluss mit Delta einrichten

97. *New Replication Flow* wählen.

98. Quellverbindung und Quellcontainer auswählen, dann die Quellobjekte
    hinzufügen.

99. Die Zielverbindung wählen, z. B. SAP Datasphere. ⚠ Bei
    Nicht-SAP-Zielen ist *Premium Outbound Integration* erforderlich.

100. Je Objekt die Projektion (Filter, Zuordnung) und die Ladeart
     *Initial and Delta* einstellen, ggf. *Truncate*.

101. Speichern, bereitstellen und *Run* ausführen.

102. Den Lauf im Data Integration Monitor überwachen (siehe Kapitel 10).

### 6.12.4 Delta-Weiterverarbeitung per Transformationsfluss

103. Für die Quelltabelle Delta-Erfassung aktivieren (siehe 6.4.2).

104. *New Transformation Flow* wählen und die View-Transformation
     grafisch oder als SQL modellieren.

105. Eine Zieltabelle zuordnen und die Ladeart *Initial and Delta*
     setzen.

106. Bereitstellen, ausführen und anschließend in eine Aufgabenkette
     einbinden.

### 6.12.5 Analysemodell erstellen

107. *New Analytic Model* wählen und eine Faktenquelle mit semantischer
     Verwendung *Fact* auswählen.

108. Kennzahlen und Attribute auswählen und assoziierte Dimensionen
     hinzufügen.

109. Berechnete oder eingeschränkte Kennzahlen anlegen.

110. Variablen über den Eigenschaftsbereich der Arbeitsfläche hinzufügen
     (*Add Variable*).

111. Das Ergebnis in der Datenvorschau mit Filtern und Variablenwerten
     prüfen.

112. Speichern und bereitstellen.

### 6.12.6 Aufgabenkette einplanen

113. *New Task Chain* wählen.

114. Die Objekte in der gewünschten Reihenfolge auf die Arbeitsfläche
     ziehen; parallele Zweige über *ALL*/*ANY* zusammenführen.

115. E-Mail-Benachrichtigung konfigurieren.

116. Speichern, bereitstellen und über *Schedule* einplanen.

## 6.13 Abhängigkeiten, Grenzen und Hinweise

-   **Bereichsbindung:** Alle Objekte liegen in einem Bereich.
    Bereichsübergreifende Nutzung ist nur über Freigaben möglich.
    Speicher- und Rechenressourcen des Bereichs (Kapitel 4) begrenzen
    Persistenz und Replikation.

-   **Verbindungsabhängigkeit:** Remote-Tabellen, Datenflüsse und
    Replikationsflüsse setzen passend konfigurierte Verbindungen voraus.
    Welche Funktionen eine Verbindung unterstützt (föderiert,
    Replikation, Datenfluss, Replikationsfluss), legt der Verbindungstyp
    fest (Kapitel 5).

-   **Bereitstellungsreihenfolge:** Abhängige Objekte lassen sich erst
    bereitstellen, wenn ihre Quellen bereitgestellt sind. Bei
    Strukturänderungen an Quellen können nachgelagerte Objekte
    Entwurfszeitfehler erhalten.

-   **Technische Namen** sind nach dem ersten Speichern bzw.
    Bereitstellen nicht mehr änderbar.

-   **Delta-Erfassung:** Die Delta-Tabelle ist nicht direkt in SQL-Views
    abfragbar. Spätere Änderungen an der Einstellung sind eingeschränkt.

-   **Python:** Skript- und Python-Operatoren unterstützen nur die
    dokumentierten Bibliotheken bzw. Funktionen, ohne E/A.

-   **Lizenz- und mandantenabhängige Funktionen** (⚠ abhängig von
    Lizenz/Freischaltung):

-   Premium Outbound Integration (Replikation in Nicht-SAP-Ziele),

-   Dateibereiche mit lokalen Tabellen (Datei) und Python-Operator in
    Transformationsflüssen,

-   Echtzeitreplikation je nach Quelle,

-   Funktionen im Rahmen von SAP Business Data Cloud.

-   **UI-Änderungen:** SAP liefert Neuerungen laufend aus. Kacheln,
    Statusbezeichnungen und Optionsnamen können abweichen. Vor
    produktiver Dokumentation ist der Stand am Mandanten zu prüfen.

## 6.14 Übersicht: Funktion -- Zweck -- benötigtes Privileg

Privilegienzuordnung gemäß Standardrollen; die Detailstufen (CRUD) sind
nicht verifiziert.

  -------------------------------------------------------------------------
  **Funktion**             **Zweck**               **Benötigtes Privileg
                                                   (Rolle)**
  ------------------------ ----------------------- ------------------------
  Data Builder öffnen,     Modellierung im Bereich *Data Warehouse Data
  Objekte                                          Builder* (z. B. *DW
  anlegen/ändern/löschen                           Modeler*) +
                                                   Bereichsmitgliedschaft

  Objekte bereitstellen    Laufzeitobjekte         *Data Warehouse Data
                           erzeugen                Builder*

  Remote-Tabellen          Quellobjekte einbinden  *Data Warehouse Data
  importieren                                      Builder*; Verbindung im
                                                   Bereich

  Datenfluss,              Daten laden             *Data Integration*
  Transformations-,                                (zusätzlich zu Data
  Replikationsfluss                                Builder)
  ausführen/einplanen                              

  Aufgabenkette            Orchestrierung          *Data Integration*
  ausführen/einplanen                              

  View-Persistenz          Laufzeitoptimierung     *Data Integration*

  Datenzugriffskontrolle   Zeilenbasierte          *Data Warehouse Data
  zuweisen                 Sicherheit              Builder*; Anlage der
                                                   DAC: *Data Warehouse
                                                   Data Access Control*
                                                   (Kapitel 9)

  Analysemodell erstellen  Analytische Nutzung     *Data Warehouse Data
                                                   Builder*

  Intelligentes            Datenabgleich ohne      *Data Warehouse Data
  Nachschlagen             Schlüssel               Builder*; Ausführung:
                                                   *Data Integration*
                                                   (nicht verifiziert)

  CSV/CSN-Import und       Datenübernahme bzw.     *Data Warehouse Data
  -Export                  Objektkopie             Builder*

  Freigabe an andere       Wiederverwendung        *Data Warehouse Data
  Bereiche                                         Builder*

  Replikation in           Outbound-Integration    wie Replikationsfluss; ⚠
  Nicht-SAP-Ziele                                  Premium Outbound
                                                   Integration erforderlich
  -------------------------------------------------------------------------
