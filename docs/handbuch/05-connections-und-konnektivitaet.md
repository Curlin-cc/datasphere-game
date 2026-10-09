# 5. Connections und Konnektivität

## 5.1 Zweck und Einordnung

Verbindungen (*Connections*) verbinden SAP Datasphere mit Quell- und
Zielsystemen, also mit Anwendungen, Datenbanken und Speichern. Jede
Verbindung entsteht aus einem Verbindungstyp (*Connection Type*). Sie
gehört genau zu einem Bereich (*Space*), und die Benutzer dieses
Bereichs verwenden sie für Modellierung und Datenzugriff. Laut
SAP-Dokumentation unterstützt jeder Verbindungstyp einen eigenen Satz
von Funktionen. Die vier wichtigsten Funktionen sind:

-   Remote-Tabellen (*Remote Tables*)

-   Datenflüsse (*Data Flows*)

-   Replikationsflüsse (*Replication Flows*)

-   Modellimport (*Model Import*)

Welche dieser Funktionen eine konkrete Verbindung bietet, hängt vom Typ
und von der Konfiguration ab.

Verbindungen bilden damit die Grundlage für alle Integrationsobjekte des
Datenbausteins (*Data Builder*, siehe Kapitel 6). Ihre
Laufzeitüberwachung erfolgt im Datenintegrationsmonitor (*Data
Integration Monitor*, siehe Kapitel 10).

## 5.2 Aufruf und Navigation

-   **Seitenleiste:** In der seitlichen Navigation (siehe Kapitel 2)
    öffnen Sie die App *Connections*. Danach wählen Sie bei Bedarf einen
    Bereich aus.

-   **Rollen:** Benutzer mit der Rolle Bereichsadministrator (*Space
    Administrator*) oder Integrator (*Integrator*) dürfen Verbindungen
    anlegen und Replikations- bzw. Integrationsaufgaben planen und
    überwachen.

-   **Privileg:** Auf Bereichsebene steuert das Privileg *Connection*
    (Anlegen, Lesen, Ändern, Löschen) den Zugriff. Die genaue Ausprägung
    der Berechtigungen ist hier **nicht verifiziert**; sie wird in
    Kapitel 3 und 9 behandelt.

-   **Systemweite Voraussetzungen:** Cloud Connector, Data Provisioning
    Agent, IP-Freigabeliste und Zertifikate werden unter *System ›
    Configuration* gepflegt. Dafür ist eine Administratorrolle nötig
    (siehe Kapitel 3).

## 5.3 Aufbau der Oberfläche

Die App *Connections* besteht aus folgenden Elementen:

  -----------------------------------------------------------------------
  **Element**                         **Inhalt**
  ----------------------------------- -----------------------------------
  Bereichsauswahl                     Legt fest, für welchen Bereich die
                                      Verbindungen angezeigt werden.

  Registerkarte *Connections*         Liste aller Verbindungen des
                                      Bereichs. Die genauen Spalten sind
                                      **nicht verifiziert**; erwartet
                                      werden Name, Verbindungstyp,
                                      Echtzeitreplikationsstatus und
                                      Änderungsdatum.

  Registerkarte *Custom Connection    Nur in Datei-Bereichen (*File
  Types*                              Space*): Übersicht und Pflege
                                      benutzerdefinierter
                                      Verbindungstypen für REST-APIs
                                      (siehe 5.4.7).

  Werkzeugleiste                      Laut Doku belegt sind *Edit* und
                                      *Validate*. Für Anlegen, Löschen
                                      sowie Pausieren und Fortsetzen der
                                      Echtzeitreplikation gibt es
                                      Aktionen; deren genaue Beschriftung
                                      ist **nicht verifiziert**.

  Assistent zum Anlegen               Mehrstufig: Verbindungstyp wählen,
                                      Verbindungseigenschaften eingeben,
                                      Name und Beschreibung vergeben.
  -----------------------------------------------------------------------

SAP ändert die Oberfläche quartalsweise. Beschriftungen und die
Reihenfolge der Schaltflächen können daher abweichen.

## 5.4 Funktionen der Connections-App

### 5.4.1 Verbindungstypen

SAP liefert für Datasphere eine Liste von Verbindungstypen aus
(*Connection Types Delivered by SAP*). Die folgende Zusammenstellung
gibt die erwartete Gliederung wieder. **Die vollständige und aktuelle
Typliste ist nicht verifiziert** und muss mit der Seite „Connection
Types Delivered by SAP" abgeglichen werden.

**SAP-Quellen (Auswahl):**

-   SAP S/4HANA Cloud und SAP S/4HANA On-Premise: belegt durch die
    Dokumentation zum Import von Entitäten.

-   SAP ABAP und SAP ECC: **nicht verifiziert**.

-   SAP BW und SAP BW/4HANA Model Transfer: **nicht verifiziert**.

-   SAP HANA (Cloud und On-Premise) sowie SAP HANA Cloud Data Lake:
    **nicht verifiziert**.

-   SAP SuccessFactors: Verbindungstyp indirekt durch SAP-KBA 3509759
    belegt.

-   SAP Ariba: Es ließ sich **nicht verifizieren**, ob ein eigener
    Verbindungstyp existiert.

**Nicht-SAP-Quellen (Auswahl):**

-   Cloud-Speicher, z. B. Amazon S3: im Abschnitt zu Open Connectors als
    nativ unterstützter Typ genannt. Weitere Typen wie Google Cloud
    Storage oder Microsoft Azure Data Lake Gen2 sind **nicht
    verifiziert**.

-   Datenbanken, z. B. Microsoft SQL Server: ebenfalls als nativ
    unterstützt genannt. Google BigQuery ist durch SAP-KBA 3424000
    indirekt belegt. Oracle und Amazon Redshift sind **nicht
    verifiziert**.

-   Generische Typen: Generic OData, Generic JDBC, Generic SFTP und
    Generic HTTP sind **nicht verifiziert**.

-   Open Connectors: für Quellen ohne eigenen Datasphere-Typ. Für nativ
    unterstützte Quellen wie Amazon S3 oder Microsoft SQL Server
    empfiehlt SAP ausdrücklich den jeweiligen eigenen Verbindungstyp.

⚠ abhängig von Lizenz/Freischaltung: Open Connectors setzt ein
SAP-BTP-Konto mit SAP Integration Suite voraus (**nicht verifiziert**).
Für Replikationsflüsse zu Nicht-SAP-Zielen gelten Abrechnungs- und
Lizenzregeln, z. B. Premium Outbound Integration (**nicht
verifiziert**).

### 5.4.2 Funktionsmatrix je Verbindungstyp

Laut SAP-Dokumentation unterstützt jeder Verbindungstyp einen eigenen
Funktionsumfang. Die tatsächlich verfügbaren Funktionen einer angelegten
Verbindung meldet die Validierung (5.4.4). Die folgende Matrix ist eine
Orientierungshilfe. **Sie ist insgesamt nicht verifiziert** und muss vor
der Freigabe mit der Seite „Connection Types Delivered by SAP"
abgeglichen werden.

  ---------------------------------------------------------------------------------
  **Verbindungstyp**   **Remote       **Data Flows** **Replication   **Model
                       Tables**                      Flows**         Import**
  -------------------- -------------- -------------- --------------- --------------
  SAP S/4HANA Cloud    ✓              ✓              ✓               ✓

  SAP S/4HANA          ✓              ✓              ✓               ✓
  On-Premise                                                         

  SAP ABAP / SAP ECC   ✓              ✓              prüfen          --

  SAP BW/4HANA Model   --             --             --              ✓
  Transfer                                                           

  SAP HANA             ✓              ✓              ✓               --

  SAP SuccessFactors   ✓              ✓              prüfen          --

  Generic OData        ✓              ✓              --              --

  Generic JDBC         ✓              --             --              --

  Cloud-Speicher (z.   --             ✓              ✓               --
  B. Amazon S3)                                                      

  Microsoft SQL Server ✓              ✓              prüfen          --
  ---------------------------------------------------------------------------------

Einige Funktionen gibt es nur über einen bestimmten Konnektivitätsweg.
Remote-Tabellen nutzen bei On-Premise-Quellen teils den Data
Provisioning Agent, Datenflüsse und Replikationsflüsse teils den Cloud
Connector (siehe 5.5). Die Zuordnung je Typ ist **nicht verifiziert**.

### 5.4.3 Verbindung anlegen

**Was und wofür:** Sie legen aus einem von SAP ausgelieferten Typ eine
Verbindung an. Damit können die Benutzer des Bereichs die verbundene
Quelle bzw. das Ziel für Modellierung und Datenzugriff nutzen.

**Wichtigste Einstellungen:**

-   Verbindungsdetails wie Host, Port, Mandant und Sprache

-   Authentifizierung, z. B. Benutzer/Kennwort, X.509-Zertifikat oder
    OAuth 2.0. Für SAP-ABAP- und S/4HANA-Verbindungen ist eine eigene
    Vorbereitung für OAuth 2.0 dokumentiert.

-   Konnektivitätsweg: Cloud Connector mit Location-ID und/oder Data
    Provisioning Agent

-   Funktionsspezifische Optionen

-   Technischer Name und Geschäftsname (*Business Name*)

Welche Felder genau erscheinen, hängt vom Typ ab.

### 5.4.4 Verbindung validieren

Sie wählen die Verbindung aus und klicken auf *Validate*. Die Meldung
zeigt, welche der unterstützten Funktionen verfügbar sind. Bei Fehlern
liefert sie Details. Die Validierung ist der erste Schritt bei jeder
Fehlersuche, etwa bei Zertifikats-, Netzwerk- oder
Berechtigungsproblemen.

### 5.4.5 Verbindung bearbeiten und löschen

Sie wählen die Verbindung aus und klicken auf *Edit*. Ist der Data
Provisioning Agent getrennt, lassen sich bestimmte Eigenschaften erst
bearbeiten, wenn der Agent wieder verbunden ist oder Sie einen anderen
Agent zuordnen.

Zum Löschen gilt laut SAP-Fachpraxis: Eine Verbindung lässt sich nicht
löschen, solange abhängige Objekte wie Remote-Tabellen oder Flüsse
bestehen. Diese Regel ist **nicht verifiziert**.

### 5.4.6 Echtzeitreplikation pausieren und fortsetzen

**Was:** Die Echtzeitreplikation einer Verbindung wird vorübergehend
angehalten.

**Wofür:** SAP nennt als Anlass vor allem das Aktualisieren oder Patchen
des Data Provisioning Agent oder Änderungen an seiner Konfiguration.

**Varianten:**

58. **Pro Verbindung** in der App *Connections*.

59. **Pro Agent:** In der Agent-Kachel unter *System › Configuration ›
    Data Integration* wählen Sie im Menü *Pause All Connections*. Der
    Status der betroffenen Verbindungen mit Replikationsstatus *Active*
    oder *Inactive* wechselt dann zu *Paused*.

Abzugrenzen ist das Pausieren geplanter Aufgaben (*Pause or Resume a
Scheduled Task*), etwa der Replikation von Remote-Tabellen oder von
Flussläufen. Dies geschieht über die Aufgabenplanung (siehe Kapitel 10).
Replikationsflüsse lassen sich laut SAP-KBA 3717654 derzeit nur einzeln
pausieren oder fortsetzen, nicht als Massenänderung.

### 5.4.7 Benutzerdefinierte Verbindungstypen

⚠ abhängig von Lizenz/Freischaltung: Diese Funktion gibt es nur in
Datei-Bereichen (*File Space*), und Datei-Bereiche setzen das
Objektspeicher-Angebot voraus (**nicht verifiziert**).

Auf der Registerkarte *Custom Connection Types* legen Sie
benutzerdefinierte Verbindungstypen für externe REST-APIs an. Aus einem
solchen Typ erzeugen Sie anschließend eine Verbindung. Mit dieser
Verbindung laden Replikationsflüsse JSON-Daten in den Objektspeicher von
SAP Datasphere.

## 5.5 Konnektivitätsvoraussetzungen

### 5.5.1 SAP Cloud Connector

Für On-Premise-Quellen, die Datenflüsse und andere Verbindungsfunktionen
nutzen, braucht es den Cloud Connector als Bindeglied zwischen SAP
Datasphere und der Quelle. Die Einrichtung umfasst drei Teile:

60. Installation des Cloud Connector im Kundennetz.

61. Anbindung an den Datasphere-Subaccount.

62. Freigabe der Backend-Ressourcen.

In Datasphere wird die Location-ID in den Verbindungseigenschaften
hinterlegt. Wo genau in *System › Configuration* die
Cloud-Connector-Daten (Subaccount, Location-ID) angezeigt werden, ist
**nicht verifiziert**.

### 5.5.2 Data Provisioning Agent

Der Agent wird on-premise installiert und in Datasphere registriert.
Seine Adapter verwalten Sie unter *System › Configuration › Data
Integration*. Beim Anlegen einer Verbindung stehen nur Adapter mit dem
Status *CONNECTED* zur Auswahl.

Der Agent wird vor allem für Remote-Tabellen und deren
Echtzeitreplikation aus bestimmten Quellen genutzt (**nicht
verifiziert**). Agent-Wartung und Pausieren siehe 5.4.6.

### 5.5.3 IP-Freigaben

Es gibt zwei Richtungen:

-   **Eingehend:** Über die IP-Freigabeliste (*IP Allowlist*) legen Sie
    fest, welche IPv4-Adressbereiche auf die Datenbank von SAP
    Datasphere zugreifen dürfen. Einzutragen ist die externe
    (öffentliche) IPv4-Adresse des Clients, der direkt auf die Datenbank
    zugreift. Dazu zählen z. B. ein Data Provisioning Agent oder andere
    Satellitensysteme.

-   **Ausgehend:** Ist das Fernsystem geschützt und nutzen Datenflüsse
    oder Replikationsflüsse die Verbindung, muss dort die
    *Replication/Data Flow NAT IP (egress)* von SAP Datasphere
    freigegeben werden. SAP-KBA 3456052 beschreibt die verwendeten
    IP-Adressen. Wo diese Adressen in der Oberfläche angezeigt werden,
    ist **nicht verifiziert**.

### 5.5.4 Zertifikate

Für TLS-gesicherte Verbindungen muss das Serverzertifikat der Quelle
oder das Zertifikat der ausstellenden Zertifizierungsstelle (CA)
hochgeladen werden. Fehlt es, meldet die Validierung, dass keine sichere
Verbindung aufgebaut werden konnte. Das Hochladen erfolgt laut SAP-KBA
unter *Configuration › Security*.

Typische Fälle:

-   Google BigQuery (SAP-KBA 3424000)

-   SAP SuccessFactors (SAP-KBA 3509759)

Für OAuth 2.0 bei ABAP- und S/4HANA-Verbindungen wird zusätzlich ein im
Cloud Connector erzeugtes Beispielzertifikat verwendet.

## 5.6 Remote-Tabellen und Datenzugriffsarten

Remote-Tabellen werden im Datenbaustein angelegt (siehe Kapitel 6). Jede
Remote-Tabelle hat eine Datenzugriffsart (*Data Access*):

  -----------------------------------------------------------------------
  **Datenzugriffsart**                **Bedeutung**
  ----------------------------------- -----------------------------------
  *Remote* (Federation)               Die Daten bleiben im Quellsystem
                                      und werden bei jeder Abfrage live
                                      gelesen.

  *Replicated (Snapshot)*             Die Daten liegen als vollständige
                                      Kopie in Datasphere. Sie werden
                                      manuell oder per Zeitplan neu
                                      geladen.

  *Replicated (Real-Time)*            Die Daten werden kopiert und
                                      anschließend laufend über
                                      Änderungserfassung aktualisiert.
  -----------------------------------------------------------------------

**Wichtig:** Starten Sie eine Snapshot-Replikation für eine Tabelle mit
*Replicated (Real-Time)*, entfernt das die Echtzeitreplikation. Die
Daten müssen danach erneut repliziert oder per Zeitplan aktualisiert
werden. Wird die Replikation entfernt, kehrt die Tabelle zum Zugriff
*Remote* zurück.

Unterstützt eine Verbindung sowohl Remote-Tabellen als auch
Replikationsflüsse, kann der Datenzugriff auf *Remote Only* beschränkt
werden. Dann wird nur über Replikationsflüsse repliziert, wie SAP es
empfiehlt, und dieselben Daten werden nicht doppelt kopiert.

Echtzeitreplikation ist nur für bestimmte Quellen, Adapter und
Objekttypen verfügbar (**nicht verifiziert**). Replikation starten,
planen und überwachen siehe Kapitel 10.

## 5.7 Import von Entitäten (Semantic Onboarding)

**Was:** Der Assistent *Import Entities* importiert semantisch
angereicherte Objekte aus ausgewählten SAP-Systemen. Er erzeugt
Entitäten im Datenbaustein und im Geschäftsbaustein (*Business Builder*)
und dazu alle Objekte, von denen diese abhängen.

**Wofür:** Bei SAP S/4HANA Cloud und S/4HANA On-Premise lädt der
Assistent Metadaten aus CDS-Views, ohne dass die Semantik manuell
nachmodelliert werden muss. Für SAP S/4HANA Cloud nennt die
S/4HANA-Dokumentation das Kommunikationsszenario SAP_COM_0532. Damit
abonniert eine ABAP-CDS-Pipeline öffentliche CDS-Views. Ob SAP BW/4HANA
Model Transfer und SAP BW Bridge im selben Assistenten unterstützt
werden, ist **nicht verifiziert**.

**Voraussetzung:** Die Verbindung unterstützt die Funktion *Model
Import* (siehe 5.4.2).

SAP bündelt Hinweise und Leitfäden zu dieser Funktion im zentralen KBA
3608311. Weitere Einzelheiten zum Datenbaustein siehe Kapitel 6, zum
Geschäftsbaustein Kapitel 7.

## 5.8 Typische Abläufe

**Ablauf A -- Verbindung anlegen und validieren**

63. Öffnen Sie in der Seitenleiste *Connections* und wählen Sie den
    Bereich aus.

64. Starten Sie das Anlegen und wählen Sie den Verbindungstyp. Die
    Funktionssymbole am Typ zeigen, welche Funktionen er unterstützt
    (**nicht verifiziert**).

65. Geben Sie Verbindungsdetails, Authentifizierung und gegebenenfalls
    Cloud Connector bzw. Data Provisioning Agent an.

66. Vergeben Sie Geschäftsnamen und technischen Namen und speichern Sie.

67. Markieren Sie die Verbindung und klicken Sie auf *Validate*. Prüfen
    Sie in der Meldung, welche Funktionen verfügbar sind.

**Ablauf B -- On-Premise-Quelle vorbereiten (Administrator)**

68. Installieren Sie den Cloud Connector und verbinden Sie ihn mit dem
    Datasphere-Subaccount. Geben Sie die Backend-Ressourcen frei.

69. Installieren und registrieren Sie bei Bedarf den Data Provisioning
    Agent und aktivieren Sie die benötigten Adapter unter *System ›
    Configuration › Data Integration*.

70. Tragen Sie die öffentliche IPv4-Adresse des Agents in die
    IP-Freigabeliste ein.

71. Laden Sie bei TLS-Verbindungen das Server- oder CA-Zertifikat unter
    *Configuration › Security* hoch.

72. Legen Sie die Verbindung nach Ablauf A an und validieren Sie sie.

**Ablauf C -- Agent-Wartung ohne Datenverlust**

73. Wählen Sie in der Agent-Kachel *Pause All Connections*.

74. Prüfen Sie, ob der Status der betroffenen Verbindungen *Paused*
    lautet.

75. Aktualisieren bzw. patchen Sie den Agent oder ändern Sie seine
    Konfiguration.

76. Setzen Sie die Echtzeitreplikation fort. Die Beschriftung der
    zugehörigen Aktion ist **nicht verifiziert**.

**Ablauf D -- Entitäten aus S/4HANA importieren**

77. Stellen Sie sicher, dass eine S/4HANA-Verbindung mit der Funktion
    *Model Import* vorhanden und validiert ist.

78. Starten Sie im Datenbaustein den Assistenten *Import Entities*.

79. Wählen Sie Verbindung und Entitäten aus.

80. Prüfen Sie die vorgeschlagenen Objekte samt Abhängigkeiten und
    starten Sie den Import. Die Einzelschritte und Optionen des
    Assistenten sind **nicht verifiziert**.

## 5.9 Abhängigkeiten, Grenzen und Hinweise

-   **Bereichsbindung:** Verbindungen gehören zu genau einem Bereich.
    Zur Bereichsverwaltung siehe Kapitel 4.

-   **Funktionen je Typ:** Funktionen hängen von Verbindungstyp *und*
    Konfiguration ab. Ohne Cloud Connector bzw. Data Provisioning Agent
    fallen einzelne Funktionen weg.

-   **Doppelte Replikation vermeiden:** Lässt sich eine Quelle über
    Remote-Tabellen und über Replikationsflüsse replizieren, empfiehlt
    SAP *Remote Only* plus Replikationsfluss.

-   **Pausieren:** Replikationsflüsse lassen sich nicht als
    Massenänderung pausieren oder fortsetzen.

-   **Agent getrennt:** Ist der Agent getrennt, sind
    Verbindungseigenschaften nur eingeschränkt bearbeitbar.

-   **Netzwerk:** Netzwerk- und Zertifikatsfehler zeigen sich meist erst
    bei der Validierung. Prüfen Sie dann IP-Freigaben in beiden
    Richtungen und die hochgeladenen Zertifikate.

-   ⚠ abhängig von Lizenz/Freischaltung: Datei-Bereiche und
    benutzerdefinierte Verbindungstypen, Open Connectors sowie
    ausgehende Replikation zu Nicht-SAP-Zielen.

-   **Oberfläche:** SAP ändert die UI quartalsweise. Beschriftungen und
    die Verbindungstypliste können sich ändern.

## 5.10 Funktion -- Zweck -- benötigtes Privileg

  ------------------------------------------------------------------------------
  **Funktion**            **Zweck**               **Benötigtes Privileg /
                                                  Rolle**
  ----------------------- ----------------------- ------------------------------
  Verbindung anlegen /    Quelle oder Ziel für    Privileg *Connection* (C/U/D)
  bearbeiten / löschen    den Bereich verfügbar   im Bereich; Rollen *Space
                          machen                  Administrator*, *Integrator*
                                                  (Privilegname **nicht
                                                  verifiziert**)

  *Validate*              Verfügbarkeit der       Privileg *Connection* (R)
                          Funktionen und          (**nicht verifiziert**)
                          Fehlerdiagnose          

  Echtzeitreplikation     Wartung,                Privileg *Connection* (U)
  pausieren / fortsetzen  Störungsbehebung        (**nicht verifiziert**)
  (Verbindung)                                    

  *Pause All Connections* Agent-Update oder       Systemadministrator (**nicht
  (Agent)                 -Patch                  verifiziert**)

  Benutzerdefinierte      REST/JSON in den        Rechte im Datei-Bereich
  Verbindungstypen        Objektspeicher laden    (**nicht verifiziert**)

  Cloud Connector, Agent, Konnektivität           Systemadministrator (siehe
  IP-Freigabeliste,       systemweit vorbereiten  Kapitel 3)
  Zertifikate                                     

  Remote-Tabellen         Snapshot oder Echtzeit  Integrator bzw.
  replizieren                                     Datenintegrationsprivilegien
                                                  (siehe Kapitel 10)

  *Import Entities*       Semantisches Onboarding Modellierungsrechte für Daten-
                          aus S/4HANA             und Geschäftsbaustein (**nicht
                                                  verifiziert**)
  ------------------------------------------------------------------------------
