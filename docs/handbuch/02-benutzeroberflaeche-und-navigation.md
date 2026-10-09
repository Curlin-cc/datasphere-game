# 2. Benutzeroberfläche und Navigation

## 2.1 Zweck und Einordnung

Dieses Kapitel beschreibt den Rahmen der Oberfläche, der für alle
Anwendungen von SAP Datasphere gleich ist. Dazu gehören:

-   die Startseite (*Home*),

-   die obere Shell-Leiste (*Shell Bar*),

-   die linke Seitenleiste (*Side Navigation*),

-   übergreifende Dienste wie Suche, Benachrichtigungen, Hilfe und
    persönliche Einstellungen,

-   UI-Muster, die in mehreren Editoren auftreten: Objektstatus,
    Bereitstellen (*Deploy*), Freigabe-Kennzeichen und Auswirkungs- und
    Herkunftsanalyse (*Impact and Lineage Analysis*).

Die fachlichen Funktionen der einzelnen Anwendungen behandeln die
Kapitel 3 bis 12. Hier steht nur, wie man sie erreicht und welche
Bedienmuster überall gleich sind.

Laut SAP sind alle Anwendungen (*Apps*) über die linke Seitenleiste
erreichbar. Jede Anwendung setzt bestimmte Privilegien voraus.
Anwendungen, für die einem Benutzer die Privilegien fehlen, werden ihm
nicht angezeigt (Getting Started with SAP Datasphere). Die Oberfläche
sieht deshalb je nach Rolle unterschiedlich aus. Rollen und Privilegien
beschreiben Kapitel 3 und Kapitel 9.

## 2.2 Aufruf und Anmeldung

4.  Rufen Sie die Mandanten-URL von SAP Datasphere im Browser auf. Die
    URL vergibt die Administration beim Einrichten des Mandanten, siehe
    Kapitel 3.

5.  Melden Sie sich über den eingerichteten Identitätsanbieter an. Das
    ist entweder der Standard-Identitätsdienst von SAP oder ein
    angebundener eigener Anbieter (siehe Kapitel 3).

6.  Nach der Anmeldung erscheint die Startseite (*Home*).

**Benötigte Berechtigung:** Für die Anmeldung braucht man einen Benutzer
im Mandanten mit mindestens einer Rolle. Benutzer, die Daten nur über
externe Werkzeuge nutzen, brauchen nach SAP keinen Zugang zur Oberfläche
und können eine reine Verbraucherrolle erhalten (siehe Kapitel 9 und
12). Welche Einträge in der Seitenleiste erscheinen, hängt von den
Privilegien der zugewiesenen Rollen ab.

## 2.3 Aufbau der Oberfläche

Die Oberfläche besteht aus drei festen Zonen:

  -----------------------------------------------------------------------
  **Zone**                **Lage**                **Inhalt**
  ----------------------- ----------------------- -----------------------
  Shell-Leiste (*Shell    oben, über die ganze    Produktlogo/-name,
  Bar*)                   Breite                  Suche,
                                                  Benachrichtigungen,
                                                  Hilfe, Benutzermenü

  Seitenleiste (*Side     links, ein- und         Einstiegspunkte aller
  Navigation*)            ausklappbar             berechtigten
                                                  Anwendungen

  Arbeitsbereich          Mitte/rechts            jeweils geöffnete
                                                  Anwendung, Editor oder
                                                  Liste, ggf. mit
                                                  Eigenschaftsbereich
                                                  (*Properties Panel*)
                                                  rechts
  -----------------------------------------------------------------------

### 2.3.1 Shell-Leiste (Shell Bar)

Die Shell-Leiste ist in allen Anwendungen sichtbar. Belegt sind diese
Elemente:

-   **Benutzersymbol** (*User Icon*): öffnet das Benutzermenü mit dem
    Eintrag Einstellungen (*Settings*), siehe 2.4.5 (Changing SAP
    Datasphere Settings).

-   **Hilfe**: Ein Fragezeichen-Symbol oben rechts öffnet die
    integrierte kontextbezogene Hilfe (*In-App Help*). Sie zeigt eine
    kurze Beschreibung dessen, was man im aktuellen Bild tun kann
    (Getting Started with SAP Datasphere).

-   **Benachrichtigungen** (*Notifications*), siehe 2.4.3.

-   **Suche**, siehe 2.4.2.

Weitere mögliche Elemente sind nicht verifiziert: ein Feedback-Symbol,
ein Produktwechsler zu verbundenen SAP-Anwendungen und die Anzeige des
Mandanten- bzw. Systemnamens. Diese Elemente sind möglicherweise ⚠
abhängig von Lizenz/Freischaltung, zum Beispiel in Mandanten von SAP
Business Data Cloud.

### 2.3.2 Linke Seitenleiste (Side Navigation)

Die Seitenleiste lässt sich ausklappen, sodass neben den Symbolen auch
die Bezeichnungen erscheinen. Sie lässt sich auch einklappen, dann
bleiben nur die Symbole sichtbar (Getting Started with SAP Datasphere).
Die folgende Tabelle zeigt die üblichen Einträge mit Verweis auf das
zuständige Kapitel. **Reihenfolge und genaue Gruppierung sind nicht
verifiziert.** Sie haben sich zwischen den Releases mehrfach geändert
und müssen am aktuellen Mandanten geprüft werden.

  -----------------------------------------------------------------------------
  **Eintrag (deutsch /       **Kurzbeschreibung**       **Kapitel**
  englisch)**                                           
  -------------------------- -------------------------- -----------------------
  Startseite (*Home*)        anpassbare Einstiegsseite  2.4.1

  Katalog & Marktplatz       Suche nach Assets und      8
  (*Catalog & Marketplace*)  Datenprodukten             

  Repository-Explorer        spaceübergreifende         2.4.7
  (*Repository Explorer*)    Objektliste (nicht         
                             verifiziert)               

  Semantisches Onboarding    Import von Inhalten und    6
  (*Semantic Onboarding*)    Entitäten (nicht           
                             verifiziert)               

  Business Builder           semantische                7
  (*Business Builder*)       Geschäftsmodellierung      

  Datenbaustein (*Data       Tabellen, Views, Flüsse,   6
  Builder*)                  Aufgabenketten             

  Datenzugriffskontrollen    zeilenbasierte Sicherheit  9
  (*Data Access Controls*)                              

  Datenintegrationsmonitor   Überwachung von Läufen     10
  (*Data Integration                                    
  Monitor*)                                             

  Verbindungen               Quellsystem-Verbindungen   5
  (*Connections*)                                       

  Data Sharing Cockpit       Anbieterseite des          8
  (*Data Sharing Cockpit*)   Marktplatzes (nicht        
                             verifiziert)               

  Bereichsverwaltung (*Space Anlegen und Konfigurieren  4
  Management*)               von Bereichen (*Spaces*)   

  Systemmonitor (*System     Systemauslastung und       10
  Monitor*)                  Protokolle                 

  Sicherheit (*Security*)    Benutzer, Rollen,          3, 9
                             Aktivitäten                

  Transport (*Transport*)    Export/Import, Pakete      11

  System (*System*)          Konfiguration,             3
                             Administration, Info       
  -----------------------------------------------------------------------------

**Zum Katalog:** Mit der Einführung von SAP Business Data Cloud hat SAP
die früher getrennten Einträge Katalog (*Catalog*) und Datenmarktplatz
(*Data Marketplace*) zu einem Eintrag *Catalog & Marketplace*
zusammengelegt (Catalog Tools and Features; SAP-Community-Beitrag
„Catalog and Data Marketplace Convergence", Februar 2025). Ältere
Mandanten oder Dokumentationsstände zeigen eventuell noch die getrennten
Einträge. ⚠ abhängig von Lizenz/Freischaltung.

### 2.3.3 Arbeitsbereich und Eigenschaftsbereich

Im Arbeitsbereich öffnet sich die gewählte Anwendung. Startseiten von
Anwendungen wie dem Datenbaustein bestehen meist aus einer Objektliste
mit Werkzeugleiste (siehe 2.4.7). Editoren bestehen meist aus drei
Teilen:

-   einer Werkzeugleiste oben (Speichern, Bereitstellen,
    Analysewerkzeuge),

-   einer Arbeitsfläche (*Canvas*) bzw. einem Code-Editor in der Mitte,

-   einem Eigenschaftsbereich rechts mit allgemeinen Eigenschaften,
    Status und Spalten- bzw. Attributlisten.

Wie die einzelnen Editoren genau aufgebaut sind, beschreiben Kapitel 6
und 7.

## 2.4 Funktionen

### 2.4.1 Startseite (Home)

**Was:** Die Startseite ist anpassbar. Laut SAP zeigt sie zuletzt
bearbeitete Objekte, Datenintegrationsaufgaben und Blogbeiträge zu SAP
Datasphere (Getting Started with SAP Datasphere, Abschnitt „The SAP
Datasphere Homepage"). **Wofür:** Schneller Wiedereinstieg in laufende
Arbeit und Überblick über den Stand der Datenintegration. **Optionen:**
Sie können einzelne Kacheln bzw. Bereiche ein- oder ausblenden. Welche
Kacheln es genau gibt und wie der Anpassungsdialog heißt, ist nicht
verifiziert.

### 2.4.2 Suche

Die Suche in der Shell-Leiste findet Objekte und Inhalte über
Anwendungen und Bereiche hinweg. Die Treffer hängen von den
Berechtigungen des Benutzers ab. Wie weit die Suche genau reicht
(Objekttypen, Katalog-Assets, Hilfeinhalte) und wie die Trefferliste
aufgebaut ist, ist **nicht verifiziert**. Die fachliche Suche im Katalog
beschreibt Kapitel 8.

### 2.4.3 Benachrichtigungen (Notifications)

Über das Benachrichtigungssymbol in der Shell-Leiste sehen Sie
Systemmeldungen. Dazu gehören zum Beispiel Ergebnisse von
Hintergrundvorgängen wie Bereitstellungen oder Importen. Nach SAP lässt
sich in den persönlichen Einstellungen einschalten, dass
Systembenachrichtigungen zusätzlich per E-Mail kommen (Changing SAP
Datasphere Settings).

Davon getrennt sind die E-Mail-Benachrichtigungen bestimmter Werkzeuge.
Replikationsflüsse (*Replication Flows*) und Aufgabenketten (*Task
Chains*) lassen sich so einrichten, dass sie über erfolgreiche oder
fehlgeschlagene Läufe informieren (siehe Kapitel 6 und 10). Welche
Ereignistypen im Benachrichtigungsbereich erscheinen, ist nicht
verifiziert.

### 2.4.4 Hilfe und Neuerungen (Help, What\'s New)

-   **Kontexthilfe:** Das Fragezeichen oben rechts öffnet die
    integrierte Hilfe. Sie zeigt eine Kurzbeschreibung des aktuellen
    Bilds und verlinkt auf die ausführliche Dokumentation (Getting
    Started with SAP Datasphere).

-   **Neuerungen:** Informationen zu neuen Funktionen gibt es über die
    Hilfe und im „What\'s New Viewer" auf help.sap.com. SAP erklärt den
    Zugang zu Neuerungen und Hilfe in einem eigenen Video („Where to
    Find What\'s New Information and Help: SAP Datasphere", März 2025).

-   **Weitere Inhalte:** Die Dokumentation unterscheidet zwischen
    offizieller Produktdokumentation und zusätzlichen Support-Inhalten
    (*Support Content*). Letztere gelten nicht als Dokumentation im
    Sinne der SAP-Geschäftsbedingungen.

Ob es im Produkt einen eigenen Einstieg „Help Center" gibt und wie er
heißt, ist **nicht verifiziert**.

### 2.4.5 Profil und Einstellungen (Settings)

**Aufruf:** Benutzersymbol in der Shell-Leiste → Einstellungen
(*Settings*). Hier steuern Sie verschiedene Aspekte der Bedienung und
legen Einwilligungen zu Datenschutz und Aufgabenplanung fest (Changing
SAP Datasphere Settings).

  ------------------------------------------------------------------------------
  **Einstellungsgruppe**      **Inhalt**                 **Belegstatus**
  --------------------------- -------------------------- -----------------------
  Sprache (*Language*)        Sprache der Oberfläche     Gruppe belegt,
                                                         Optionsliste nicht
                                                         verifiziert

  Datenzugriffssprache (*Data Sprache, in der            nicht verifiziert
  Access Language*)           sprachabhängige Texte und  
                              Beschreibungen aus den     
                              Daten gelesen werden       

  Datums- und Zeitformate     Anzeige von Datum und      nicht verifiziert
                              Uhrzeit                    

  Zahlenformat / Skalierung   Systemstandard, kurz (k,   belegt
                              m, bn) oder lang           
                              (Thousand, Million,        
                              Billion)                   

  Währungsdarstellung         Anzeige der                belegt
                              Währungssymbole            

  E-Mail-Benachrichtigungen   Systembenachrichtigungen   belegt
                              zusätzlich per E-Mail      

  Datenschutz (*Data          Einwilligungsoptionen      belegt
  Privacy*)                                              

  Einwilligung zur            Zustimmung, dass geplante  belegt (genaue Wirkung
  Aufgabenplanung (*Task      Aufgaben im Namen des      siehe Kapitel 10)
  Scheduling Consent*)        Benutzers laufen           

  UI-Einstellungen            z\. B. Anzeige von         nicht verifiziert
                              Geschäftsname (*Business   
                              Name*) oder technischem    
                              Namen (*Technical Name*)   
                              in Editoren                
  ------------------------------------------------------------------------------

**Hinweis:** Die Einwilligung zur Aufgabenplanung hat fachliche Folgen.
Ohne Einwilligung laufen geplante Aufgaben, deren Eigentümer der
Benutzer ist, möglicherweise nicht. Die genaue Wirkung beschreibt
Kapitel 10. Ihre Gültigkeitsdauer ist nicht verifiziert.

### 2.4.6 Bereichsauswahl in Anwendungen und Editoren

Modellierungs- und Überwachungsanwendungen arbeiten immer im Kontext
eines Bereichs (*Space*). Dazu gehören der Datenbaustein, der Business
Builder, die Datenzugriffskontrollen, der Datenintegrationsmonitor und
die Verbindungen.

-   Ist ein Benutzer mehreren Bereichen zugeordnet, wählt er beim Öffnen
    der Anwendung einen Bereich aus.

-   Den Bereich wechseln kann er über eine Bereichsauswahl im Kopf der
    Anwendung.

Wie diese Auswahl genau aussieht (Kachelauswahl oder Auswahlliste) und
ob der zuletzt gewählte Bereich gespeichert wird, ist **nicht
verifiziert**. Ohne Zuordnung zu mindestens einem Bereich sind diese
Anwendungen leer bzw. nicht nutzbar. Zuordnung und Bereichsrollen
beschreibt Kapitel 4.

### 2.4.7 Objektlisten

Die Startseiten der Modellierungsanwendungen zeigen die Objekte des
gewählten Bereichs als Liste. Dazu gehören vor allem der Datenbaustein
und der Business Builder, laut aktuellen Ständen auch ein
spaceübergreifender Repository-Explorer. Üblich sind:

-   Spalten wie Geschäftsname, technischer Name, Typ, Status, geändert
    von/am (nicht verifiziert),

-   Filter nach Objekttyp und Status sowie eine Suche in der Liste,

-   Mehrfachauswahl für Sammelaktionen wie Bereitstellen, Löschen,
    Exportieren oder Freigeben,

-   Einstieg in die Anlage neuer Objekte.

Welche Spalten und Sammelaktionen es genau gibt, ist **nicht
verifiziert**. Die objektspezifischen Aktionen beschreibt Kapitel 6.

### 2.4.8 Gemeinsame UI-Muster

#### 2.4.8.1 Objektstatus und Bereitstellungsstatus

Jedes Modellierungsobjekt hat einen Bereitstellungsstatus (*Deployment
Status*). Er steht im Eigenschaftsbereich des Editors und in der
Objektliste. In der Dokumentation belegt sind diese Werte (Saving and
Deploying Objects; Process Source Changes in a Graphical View):

  -----------------------------------------------------------------------
  **Status**                          **Bedeutung**
  ----------------------------------- -----------------------------------
  Nicht bereitgestellt (*Not          Das Objekt wurde nie bereitgestellt
  Deployed*)                          und existiert nur als
                                      Design-Time-Artefakt.

  Bereitgestellt (*Deployed*)         Die aktuelle Version ist zur
                                      Laufzeit verfügbar.

  Änderungen bereitzustellen          Es gibt gespeicherte Änderungen,
  (*Changes to Deploy*)               die noch nicht bereitgestellt sind.

  Design-Time-Fehler (*Design-Time    Gespeicherte, aber noch nicht
  Error*)                             bereitgestellte Änderungen an einer
                                      Quelle erzeugen einen Fehler im
                                      abhängigen Objekt.
  -----------------------------------------------------------------------

Es gibt weitere Status, zum Beispiel für Laufzeitfehler oder laufende
Bereitstellungen. Diese sind **nicht verifiziert**.

#### 2.4.8.2 Speichern und Bereitstellen (Save, Deploy)

Speichern legt die Design-Time-Definition ab. Erst das Bereitstellen
erzeugt die Laufzeitobjekte in der Datenbank. Damit die Laufzeit
konsistent bleibt, prüft SAP Datasphere beim Bereitstellen die Herkunft
(*Lineage*) des Objekts. Dabei stellt es alle Objekte mit bereit, die
noch nicht den Status *Deployed* haben (Saving and Deploying Objects).

Objekte werden im CSN-Format gespeichert. Eine CSN-Datei darf höchstens
25 MB groß sein. Bei sehr komplexen Views mit vielen Quellen oder
Spalten kann das beim Speichern oder Transportieren zu Problemen führen
(Creating a Graphical View).

Bestimmte Objekte lassen sich nur unter Bedingungen bereitstellen.
Aufgabenketten zum Beispiel lassen sich mit nicht verbundenen Knoten
speichern, aber erst bereitstellen und ausführen, wenn alle Knoten
verbunden sind (Creating a Task Chain).

#### 2.4.8.3 Freigabe-Kennzeichen (Shared)

Tabellen und Views lassen sich für andere Bereiche freigeben (siehe
Kapitel 4 und 6). Freigegebene Objekte erscheinen im Zielbereich als
Quellen. Sie sind gekennzeichnet, etwa durch ein Freigabesymbol und den
Namen des Quellbereichs. Diese Darstellung ist **nicht verifiziert**.
Ein dokumentierter Sonderfall zeigt die Grenzen von Freigaben: Eine
freigegebene View lässt sich unter Umständen nicht bereitstellen, wenn
sie auf Zeittabellen (SAP.TIME) verweist, die nur im Ursprungsbereich
angelegt wurden (SAP-KBA 3396532).

#### 2.4.8.4 Auswirkungs- und Herkunftsanalyse (Impact and Lineage Analysis)

Das Diagramm zur Auswirkungs- und Herkunftsanalyse zeigt die Herkunft
(*Lineage*) eines gewählten Objekts oder einzelner seiner Spalten. Es
zeigt außerdem die Auswirkungen (*Impacts*), also die abhängigen
Objekte, die von Änderungen betroffen wären (Impact and Lineage
Analysis). Sie öffnen es aus den Editoren und Objektlisten der
Modellierungsanwendungen. Wie der Einstieg genau beschriftet ist, ist
nicht verifiziert. Wie Sie im Diagramm arbeiten, beschreibt Kapitel 6.

### 2.4.9 Tastatur und Barrierefreiheit

Die Oberfläche von SAP Datasphere baut auf SAP-UI-Technologie auf. Die
allgemeinen Tastaturkonventionen von SAPUI5/SAP Fiori sind dokumentiert,
etwa Tab-Navigation, sichtbarer Fokus und Tastenkombinationen in Listen.
Für SAP Datasphere selbst wurde jedoch **keine** eigene Seite mit
Tastenkombinationen oder Barrierefreiheitseinstellungen gefunden.
Schalter wie „Erweiterte Bildschirmleser-Unterstützung" sind für andere
SAP-Cloud-Produkte belegt. Für SAP Datasphere sind sie **nicht
verifiziert** und dürfen hier nicht als vorhanden gelten.

## 2.5 Typische Abläufe

**Ablauf A -- Persönliche Einstellungen anpassen**

7.  Klicken Sie in der Shell-Leiste auf das Benutzersymbol.

8.  Wählen Sie *Settings*.

9.  Legen Sie Sprache, Formate und Zahlenskalierung fest (kurz, lang
    oder Systemstandard).

10. Aktivieren Sie bei Bedarf E-Mail-Benachrichtigungen.

11. Prüfen Sie die Einwilligungen zu Datenschutz und Aufgabenplanung.

12. Speichern Sie. Die genaue Beschriftung der Schaltfläche ist nicht
    verifiziert.

**Ablauf B -- Objekt finden und bearbeiten**

13. Öffnen Sie in der Seitenleiste die gewünschte Anwendung, zum
    Beispiel den Datenbaustein.

14. Wählen Sie den Bereich (*Space*) aus.

15. Grenzen Sie die Objektliste mit Filter oder Suche ein.

16. Öffnen Sie das Objekt und prüfen Sie im Eigenschaftsbereich den
    Bereitstellungsstatus.

17. Nehmen Sie Ihre Änderungen vor, speichern Sie, und stellen Sie das
    Objekt anschließend bereit.

**Ablauf C -- Auswirkungen vor einer Änderung prüfen**

18. Öffnen Sie das Objekt.

19. Starten Sie die Auswirkungs- und Herkunftsanalyse.

20. Prüfen Sie die abhängigen Objekte.

21. Stimmen Sie die Änderung mit den Verantwortlichen der betroffenen
    Objekte ab.

## 2.6 Abhängigkeiten, Grenzen, Hinweise

-   **Rollenabhängige Sicht:** Fehlende Einträge in der Seitenleiste
    deuten fast immer auf fehlende Privilegien hin, nicht auf einen
    Fehler (siehe Kapitel 3 und 9).

-   **Bereichskontext:** Modellierungsanwendungen funktionieren nur mit
    Zuordnung zu einem Bereich (siehe Kapitel 4).

-   **Releasewechsel:** Einträge und Gruppen in der Seitenleiste (z. B.
    *Catalog & Marketplace*) ändern sich mit der Produktentwicklung.
    Prüfen Sie Screenshots und Schulungsunterlagen nach jedem
    Quartalsrelease.

-   **SAP Business Data Cloud:** In Mandanten, die zu SAP Business Data
    Cloud gehören, können zusätzliche oder umbenannte Einstiege
    erscheinen. ⚠ abhängig von Lizenz/Freischaltung.

-   **Bereitstellen hat Kettenwirkung:** Weil beim Bereitstellen die
    Herkunft mit bereitgestellt wird, kann ein einzelner Vorgang weitere
    Objekte verändern.

## 2.7 Übersicht: Funktion -- Zweck -- benötigtes Privileg

  --------------------------------------------------------------------------
  **Funktion**            **Zweck**               **Benötigtes Privileg**
  ----------------------- ----------------------- --------------------------
  Startseite              Einstieg, zuletzt       jede Rolle mit Zugang zur
                          bearbeitete Objekte,    Oberfläche (nicht
                          Aufgaben                verifiziert)

  Einstellungen           persönliche             kein besonderes Privileg
                          Darstellung,            (nicht verifiziert)
                          Einwilligungen          

  Hilfe / Neuerungen      Kontexthilfe,           keines
                          Dokumentation           

  Benachrichtigungen      Systemmeldungen,        keines (nicht verifiziert)
                          optional per E-Mail     

  Seitenleiste --         Zugriff auf die         je Anwendung eigene
  Anwendungen             Anwendungen             Privilegien, siehe
                                                  „Privileges by App, Tool,
                                                  Object, and Task" (Kapitel
                                                  3/9)

  Bereichsauswahl         Arbeitskontext          Zuordnung zum Bereich
                          festlegen               (Kapitel 4)

  Speichern /             Design-Time bzw.        Modellierungsprivilegien
  Bereitstellen           Laufzeit erzeugen       des Datenbausteins bzw.
                                                  Business Builders (Kapitel
                                                  6/7, Bezeichnungen nicht
                                                  verifiziert)

  Auswirkungs- und        Abhängigkeiten          Leserecht auf die Objekte
  Herkunftsanalyse        analysieren             (nicht verifiziert)
  --------------------------------------------------------------------------
