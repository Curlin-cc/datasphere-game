# 3. Administration (Systemkonfiguration, Benutzer, Rollen)

## 3.1 Zweck und Einordnung

Die Administration bündelt alle mandantenweiten Einstellungen (*tenant*)
von SAP Datasphere. Laut SAP-Dokumentation sind Benutzer mit einer
Administratorrolle für folgende Aufgaben zuständig:

-   Benutzer und Rollen verwalten,

-   die Konnektivität für die Datenintegration vorbereiten,

-   Bereiche (*Spaces*) anlegen und ihnen Speicher zuweisen,

-   den Mandanten überwachen und warten.

Wie der Mandant bereitgestellt wird, steuert die Administration nicht.
Das geschieht entweder als Teil einer SAP-Business-Data-Cloud-Formation
(*formation*) in SAP for Me oder über das SAP BTP Cockpit. Die Größe des
Mandanten (*Tenant Sizing*) wird dagegen immer in SAP Datasphere selbst
festgelegt, unabhängig vom Bereitstellungsweg.

Abgrenzung zu anderen Kapiteln:

-   Das Anlegen und Konfigurieren einzelner Spaces beschreibt Kapitel 4.

-   Verbindungen und Agenten beschreibt Kapitel 5.

-   Datenzugriffskontrollen (*Data Access Controls*) und das
    übergreifende Sicherheitskonzept beschreibt Kapitel 9.

-   Die Überwachungswerkzeuge beschreibt Kapitel 10.

Dieses Kapitel deckt die Werkzeuge der Gruppen System (*System*) und
Sicherheit (*Security*) in der Seitenleiste ab.

## 3.2 Aufruf und Navigation

Die Administrationswerkzeuge erreichen Sie über die Seitenleiste (Aufbau
siehe Kapitel 2). Laut der SAP-Seite „Administration Apps and Tools"
gibt es dort zwei Gruppen:

  ------------------------------------------------------------------------
  **Gruppe in der         **Einträge**             **Zweck**
  Seitenleiste**                                   
  ----------------------- ------------------------ -----------------------
  System (*System*)       Konfiguration            Mandantenweite
                          (*Configuration*),       technische
                          Administration           Einstellungen, Größe,
                          (*Administration*), Info Protokolle,
                          (*About*)                Identitätsanbieter,
                                                   Systeminformationen

  Sicherheit (*Security*) Benutzer (*Users*),      Benutzer anlegen und
                          Rollen (*Roles*),        verwalten, Rollen
                          Berechtigungsübersicht   zuweisen,
                          (*Authorization          Berechtigungen
                          Overview*), Aktivitäten  auswerten, Aktivitäten
                          (*Activities*)           nachverfolgen
  ------------------------------------------------------------------------

**Benötigte Rollen**

-   Für fast alle Funktionen dieses Kapitels brauchen Sie eine globale
    Administratorrolle: die Standardrolle *DW Administrator* oder eine
    benutzerdefinierte Rolle mit den entsprechenden Privilegien.

-   Einige Funktionen sind dem Systemverantwortlichen (*System Owner*)
    vorbehalten. Dazu gehört insbesondere die Einrichtung eines eigenen
    SAML-Identitätsanbieters (siehe 3.6).

-   Welche Einzelprivilegien jede Registerkarte genau erfordert, ist
    nicht vollständig verifiziert (siehe Tabelle 3.8).

## 3.3 System → Konfiguration (Configuration)

### 3.3.1 Aufbau der Oberfläche

Die Seite Konfiguration besteht aus mehreren Registerkarten. Jede Karte
enthält ein eigenes Formular oder eine Liste mit Bearbeitungs- und
Speicherfunktionen.

-   **Belegt** sind die Karten bzw. Bereiche Audit (*Audit*), Sicherheit
    (*Security*), Systeminformationen (*System Information*) und der
    Bereich zur Verwaltung der Aufgabenprotokolle.

-   **Nicht verifiziert** sind die genaue Reihenfolge und die
    Beschriftung aller übrigen Karten, darunter Mandantenkonfiguration
    (*Tenant Configuration*), Arbeitslastverwaltung (*Workload
    Management*), Datenintegration (*Data Integration*),
    IP-Zulassungsliste (*IP Allowlist*) und Mandantenverknüpfungen
    (*Tenant Links*).

SAP passt diese Registerkarten quartalsweise an. Die Karte im eigenen
Mandanten ist daher maßgeblich.

### 3.3.2 Mandantenkonfiguration und Speicherzuweisung (Tenant Configuration)

**Was:** Hier legen Sie die Größe des Mandanten fest, also die
Ressourcen, die Sie nach Ihrem Bedarf angeben. Für Speicher und
Rechenleistung werden Kapazitätseinheiten (*Capacity Units*, CU)
zugewiesen.

**Wofür:** Die Größe lässt sich für abonnementbasierte Mandanten und für
verbrauchsbasierte Mandanten mit Standardplan konfigurieren. Die
Konfiguration umfasst Speicher (*Storage*), Arbeitsspeicher (*Memory*),
Rechenressourcen (*Compute*) und weitere verfügbare Kapazitätsoptionen.

**Wichtigste Optionen:**

-   Dimensionierung von Speicher und Arbeitsspeicher der Datenbank.

-   Zusatzoptionen. Welche das genau sind, ist für diese Fassung **nicht
    verifiziert**. Nach Produktkenntnis gehören dazu etwa Data Lake,
    elastische Rechenknoten (*Elastic Compute Nodes*), Kapazität für
    Datenintegration und Premium-Ausgangsintegration, SAP BW Bridge und
    Katalog. ⚠ abhängig von Lizenz/Freischaltung.

-   Die Anzeige der verbrauchten und verfügbaren CU dient zugleich als
    Lizenz- und Kapazitätsanzeige im Mandanten (siehe 3.5.2).

**Hinweis:** Wie Sie den zugewiesenen Speicher auf einzelne Spaces
verteilen, beschreibt Kapitel 4. Ob sich eine einmal erhöhte Größe
wieder verringern lässt und wie lange eine Größenänderung dauert, ist
**nicht verifiziert**.

### 3.3.3 Arbeitslastverwaltung (Workload Management)

**Was:** Hier steuern Sie Prioritäten und Anweisungslimits (*statement
limits*) für Datenbankabfragen.

**Wofür:** Sie verhindern, dass einzelne Spaces sich gegenseitig
Ressourcen entziehen.

**Optionen:**

-   Standardmäßig setzen Sie Priorität und Anweisungslimits je Space.
    Alternativ geht das je Gruppe.

-   Für jeden neu angelegten Space erscheint auf der Seite
    Arbeitslastverwaltung eine neue Zeile mit Standardpriorität und
    Standardlimits.

-   Die Werteskala der Space-Priorität (1 = niedrigste bis 8 = höchste)
    stammt nur aus einem Community-Beitrag und ist auf help.sap.com
    **nicht verifiziert**.

### 3.3.4 Audit (Audit)

**Was:** Mandantenweite Verwaltung der Prüfprotokolle (*audit logs*).

**Wofür:** Space-Administratoren aktivieren in ihrem Space die
Protokollierung von Lese- und/oder Änderungsaktionen (siehe Kapitel 4).
Administratoren erhalten unter Audit einen Überblick über diese
Protokolle und können sie löschen, zum Beispiel um Plattenspeicher
freizugeben.

**Optionen:**

-   **Löschen von Prüfprotokollen** (*Audit Log Deletion*): Für jeden
    Space lassen sich die Einträge zu Leseoperationen und zu
    Änderungsoperationen getrennt löschen. Gelöscht werden alle
    Einträge, die vor einem angegebenen Zeitpunkt erfasst wurden.

-   Zusätzlich können Sie die Prüfrichtlinie für
    Datenbank-Analysebenutzer (*DWC_ANALYSIS_USERS_AUDIT_ALL*)
    auswählen.

### 3.3.5 Aufbewahrung der Aufgabenprotokolle (Task Logs)

**Was:** Im Konfigurationsbereich sehen Sie, wie viel Speicher die
Aufgabenprotokolle im Mandanten belegen.

**Wofür:** Veraltete Protokolle lassen sich löschen, um den
Speicherverbrauch zu senken.

**Optionen:** Ob es eine automatische Aufbewahrungsfrist gibt und welche
Zeiträume sich wählen lassen, ist **nicht verifiziert**. Die Protokolle
selbst wertet man im Monitor für die Datenintegration aus (siehe Kapitel
10).

### 3.3.6 Sicherheit (Security)

**Was:** Kennwortrichtlinie für Datenbankbenutzer (*database users*).

**Optionen:**

-   Komplexitätsanforderungen,

-   Ablauffrist in Tagen; danach muss der Benutzer ein neues Kennwort
    festlegen,

-   Einschränkungen für die Wiederverwendung von Kennwörtern.

**Hinweis:** Die Richtlinie wird wirksam, sobald ein Datenbankbenutzer
neu angelegt oder bearbeitet wird. Datenbankbenutzer selbst legt man im
Space an (siehe Kapitel 4 und 12).

### 3.3.7 Datenintegration (Data Integration)

Auf dieser Registerkarte werden mandantenweite Einstellungen für die
Integrationsinfrastruktur erwartet, etwa die Registrierung von
On-Premise-Agenten (Data Provisioning Agent), Einstellungen für
Live-Datenverbindungen und Treiber von Drittanbietern. Diese Aufzählung
ist **nicht verifiziert**. Die fachliche Beschreibung der Agenten und
des Cloud Connectors folgt in Kapitel 5.

### 3.3.8 IP-Zulassungsliste (IP Allowlist)

**Was:** Hier legen Sie fest, aus welchen IPv4-Adressbereichen ein
direkter Zugriff auf die Datenbank von SAP Datasphere erlaubt ist.
Einzutragen ist die externe, öffentliche IPv4-Adresse bzw. der
Adressbereich des Clients, der sich direkt mit der Datenbank verbindet.

**Optionen:**

-   Adressen direkt eingeben oder aus einer CSV-Datei importieren,

-   die Liste exportieren.

Ob es neben der Liste für Clients (*Trusted IPs*) eine zweite Liste für
Cloud-Connector-Adressen (*Trusted Cloud Connector IPs*) gibt, ist
**nicht verifiziert**.

**Abgrenzung:** Die umgekehrte Richtung, also die Adressen von SAP
Datasphere, die in Remote-Systemen freigegeben werden müssen, gehört zur
Konnektivität (siehe Kapitel 5).

### 3.3.9 Mandantenverknüpfungen (Tenant Links)

**Was:** Sie können den SAP-Datasphere-Mandanten mit einem
SAP-Analytics-Cloud-Mandanten verknüpfen. Dieser ist dann über den
Produktumschalter (*Product Switch*) rechts in der Shell-Leiste
erreichbar, und die Benutzer wechseln einfacher zwischen den Produkten.
Umgekehrt können Administratoren von SAP Analytics Cloud und SAP
Business Data Cloud ihrerseits Verknüpfungen auf den Mandanten anlegen.

**Hinweis:** Laut SAP-Hinweis (KBA 3774129) wird ab SAC QRC3 2026 das
bisherige Anlegen von Verknüpfungen über die Registerkarte Tenant Links
in SAP Analytics Cloud abgekündigt. Empfohlen wird eine
formationsbasierte Verknüpfung. Das ist eine KBA-Quelle, nicht
help.sap.com; prüfen Sie sie vor der Freigabe.

### 3.3.10 Systeminformationen (System Information)

**Was:** Sie können eine farbige Informationsleiste einblenden, die alle
Benutzer des Mandanten sehen, etwa um Test- und Produktivsysteme zu
unterscheiden. Außerdem lässt sich festlegen, ob in
Browser-Registerkarten, Lesezeichen, Suchergebnissen und im Verlauf das
SAP- oder das Datasphere-Symbol erscheint.

**Hinweis:** Laut SAP-Hinweis 3802905 können diese Einstellungen je nach
Plattformversion statt unter Administration → Standarddarstellung
(*Default Appearance*) unter Konfiguration → Systeminformationen stehen.

## 3.4 System → Administration (Administration)

### 3.4.1 Zweck und Aufbau

Die Seite Administration enthält plattformnahe Einstellungen, die SAP
Datasphere mit SAP Analytics Cloud teilt. Laut SAP-Hinweis 2992349
gehören die Benutzerverwaltung, die Erstellung von OAuth-Clients und das
Content Network zur „Plattformversion". Belegt ist die Registerkarte
Sicherheit (*Security*) mit der Wahl der Authentifizierungsmethode
(siehe 3.6). Weitere Registerkarten wie Systemkonfiguration,
Konfiguration von Datenquellen oder App-Integration sind für diese
Fassung **nicht verifiziert**.

### 3.4.2 OAuth-Clients

Für technische Zugriffe, etwa die Benutzerbereitstellung über SAP Cloud
Identity Services -- Identity Provisioning, wird in SAP Datasphere ein
OAuth-Client mit dem Gewährungstyp Client-Anmeldedaten (*Client
Credentials*) angelegt. Unter welchem Menüpfad das geschieht, ist
**nicht verifiziert**.

## 3.5 System → Info (About) sowie Lizenz- und Kapazitätsanzeige

### 3.5.1 Info-Dialog

Der Eintrag Info zeigt Angaben zum Mandanten. Welche Felder er genau
enthält, ist **nicht verifiziert**. Nach Produktkenntnis gehören dazu
etwa Versionsstand, Mandanten- und Datenbankkennungen und lizenzbezogene
Kennzahlen. Laut SAP-Hinweis 2992349 unterscheidet SAP zwischen der
Datasphere-Version und einer Plattformversion. Beide Angaben sind für
Supportfälle relevant.

### 3.5.2 Lizenz- und Kapazitätsanzeige

Die Kapazität verwalten Sie über die Mandantenkonfiguration in
Kapazitätseinheiten (siehe 3.3.2). Ob es neben der CU-Anzeige eine
eigene Seite mit Lizenzkennzahlen gibt, etwa die Zahl der lizenzierten
Benutzer, ist **nicht verifiziert**. ⚠ abhängig von
Lizenz/Freischaltung: Die angezeigten Optionen hängen vom Vertragsmodell
ab (Abonnement oder Verbrauch mit Standardplan) und davon, ob die
Bereitstellung über SAP Business Data Cloud erfolgt.

## 3.6 Identitätsanbieter und SAML-SSO

### 3.6.1 Zweck

Standardmäßig authentifiziert sich ein Benutzer über den von SAP
bereitgestellten Identitätsanbieter. Alternativ binden Sie einen eigenen
SAML-2.0-Identitätsanbieter an, zum Beispiel Microsoft Entra ID (Azure
AD) oder SAP Cloud Identity Services -- Identity Authentication. Der
eigene Identitätsanbieter ist eine eigenständige Lösung außerhalb von
SAP Datasphere. Änderungen an seiner Konfiguration nehmen Sie deshalb
dort vor.

### 3.6.2 Voraussetzungen

-   Ein Identitätsanbieter, der SAML 2.0 unterstützt.

-   Die Möglichkeit, diesen Identitätsanbieter zu konfigurieren.

-   Die Rolle des Systemverantwortlichen (*System Owner*) im Mandanten.

### 3.6.3 Typischer Ablauf

Die einzelnen Schritte stammen teilweise aus einem
SAP-Community-Beitrag. Die genauen Beschriftungen sind auf help.sap.com
**nicht verifiziert**.

22. Öffnen Sie in der Seitenleiste System → Administration und dann die
    Registerkarte Sicherheit (*Security*).

23. Wechseln Sie in den Bearbeitungsmodus und wählen Sie als
    Authentifizierungsmethode SAML Single Sign-On (SSO).

24. Laden Sie die Metadaten des Dienstanbieters herunter, also des
    SAP-Datasphere-Mandanten.

25. Hinterlegen Sie diese Metadaten im eigenen Identitätsanbieter.

26. Laden Sie die Metadaten des Identitätsanbieters in SAP Datasphere
    hoch.

27. Legen Sie das Benutzerattribut für die Zuordnung fest, etwa eine
    benutzerdefinierte SAML-Benutzerzuordnung (*Custom SAML User
    Mapping*).

28. Prüfen Sie die Anmeldung mit einem Testbenutzer und schließen Sie
    die Umstellung ab.

### 3.6.4 Hinweise

-   SAP führt die bisherige Einrichtung inzwischen als „Legacy Custom
    IdP". Wie sie sich zu den neueren Varianten im Umfeld von SAP
    Business Data Cloud verhält, sollten Sie vor der Freigabe prüfen.

-   Läuft das Zertifikat des Identitätsanbieters ab und ist der
    Systemverantwortliche nicht erreichbar, muss laut SAP-Hinweis
    3635337 ein Supportfall unter der Komponente DS-SEC-AUTN eröffnet
    werden.

-   Planen Sie die Erneuerung des Zertifikats daher rechtzeitig ein.

## 3.7 Sicherheit (Security): Benutzer, Rollen, Berechtigungsübersicht, Aktivitäten

### 3.7.1 Benutzer (Users)

**Was:** Benutzer in SAP Datasphere anlegen, ändern und verwalten und
ihnen vordefinierte Standardrollen oder selbst erstellte
benutzerdefinierte Rollen zuweisen.

**Aufbau:** Eine Benutzerliste mit Werkzeugleiste. Folgende Funktionen
sind **nicht verifiziert**: Import aus CSV, Anzeige- und
Filterfunktionen, Spalten für Benutzer-ID, Name, E-Mail und zugewiesene
Rollen.

**Systemverantwortlicher:** Wer SAP Datasphere erwirbt, wird automatisch
Systemverantwortlicher. Ist der Käufer nicht die richtige Person für die
Administration, kann er die Rolle an eine geeignete Person übertragen.

### 3.7.2 Benutzerverwaltung über SCIM 2.0

**Was:** SAP Datasphere bietet eine REST-Schnittstelle nach der
Spezifikation System for Cross-domain Identity Management (SCIM 2.0).
Darüber legen Sie Benutzer an, lesen, ändern und löschen sie und fügen
sie Rollen hinzu.

**Wofür:** Der Mandant bleibt mit der bevorzugten
Identitätsmanagement-Lösung synchron.

**Grenzen laut SAP-Hinweis 3469816 (KBA):**

-   Unterstützt werden nur benutzerbezogene SCIM-Operationen.

-   Rollen lassen sich über SCIM weder anlegen noch ändern.

-   Bei Bereitstellung über SAP Cloud Identity Services -- Identity
    Provisioning werden keine Gruppen übertragen.

**Voraussetzung für die Anbindung über Identity Provisioning:**

-   ein eigener SAML-Identitätsanbieter mit benutzerdefinierter
    SAML-Benutzerzuordnung,

-   ein OAuth-Client mit Client-Anmeldedaten (siehe 3.4.2).

### 3.7.3 Rollen (Roles)

**Rollentypen**

  -----------------------------------------------------------------------
  **Rollentyp**                       **Beschreibung**
  ----------------------------------- -----------------------------------
  Standardrolle (*Standard Role*)     Wird mit SAP Datasphere
                                      ausgeliefert und enthält einen
                                      vordefinierten Satz an Privilegien
                                      und Berechtigungen. SAP empfiehlt,
                                      sie als Vorlage für
                                      benutzerdefinierte Rollen zu
                                      nutzen.

  Benutzerdefinierte Rolle (*Custom   Wird auf Basis einer leeren Vorlage
  Role*)                              oder einer Standardrolle erstellt;
                                      Privilegien und Berechtigungen
                                      wählen Sie nach Bedarf.

  Bereichsbezogene Rolle (*Scoped     Weist Benutzern Privilegien für
  Role*)                              bestimmte Spaces zu. Rolle,
                                      Benutzer und Spaces werden in der
                                      Rolle selbst verknüpft. SAP liefert
                                      vordefinierte bereichsbezogene
                                      Rollen aus, denen Sie direkt Spaces
                                      und Benutzer zuordnen können.
  -----------------------------------------------------------------------

**Standardrollen anzeigen**

Öffnen Sie Sicherheit → Rollen und setzen Sie die Filter Lizenztyp
(*License Type*) = SAP Datasphere und Rollentyp (*Role Type*) =
Standardrolle (*Standard Role*). Zu den Standardrollen zählen unter
anderem *DW Administrator* (alle Space-Berechtigungen), *DW Viewer*
(keine Space-Berechtigungen) und *Catalog User* (Inhalte im Katalog
suchen und entdecken). Einige Rollen müssen laut Dokumentation mit einer
weiteren Rolle wie *DW Viewer* oder *DW Modeler* kombiniert werden,
damit der Benutzer überhaupt auf SAP Datasphere zugreifen kann.

Folgende Rollen sind für diese Fassung **nicht verifiziert**:

-   die weiteren Standardrollen (*DW Space Administrator*, *DW
    Integrator*, *DW Modeler*, *DW Consumer*, *Catalog Administrator*,
    *System Owner*),

-   die Namen der vordefinierten bereichsbezogenen Rollen (z. B. „DW
    Scoped ...").

**Globale und bereichsbezogene Privilegien:** Privilegien und
Berechtigungen bestimmen, welche Aktionen ein Benutzer in welchen
Werkzeugen ausführen darf. Mandantenweite Privilegien vergeben Sie über
globale Rollen, Space-bezogene über bereichsbezogene Rollen.
Bereichsbezogene Rollen lassen sich auch über die Kommandozeile
(*datasphere command line interface*) verwalten: auflisten, lesen,
anlegen, ändern, löschen sowie Benutzer und Spaces hinzufügen oder
entfernen (siehe Kapitel 12).

**Typischer Ablauf: bereichsbezogene Rolle anlegen und zuweisen**

29. Öffnen Sie Sicherheit → Rollen.

30. Legen Sie eine neue bereichsbezogene Rolle an, wahlweise auf Basis
    einer Vorlage. Alternativ verwenden Sie eine vordefinierte
    bereichsbezogene Rolle.

31. Wählen Sie die gewünschten Privilegien und Berechtigungen.

32. Ordnen Sie der Rolle die Spaces zu.

33. Ordnen Sie der Rolle die Benutzer zu. Jeder Benutzer erhält die
    Privilegien dann in allen zugeordneten Spaces.

34. Speichern Sie die Rolle und prüfen Sie das Ergebnis in der
    Berechtigungsübersicht (3.7.4).

**Typischer Ablauf: benutzerdefinierte globale Rolle**

35. Öffnen Sie Sicherheit → Rollen und legen Sie eine neue Rolle an.

36. Wählen Sie eine leere Vorlage oder eine Standardrolle als Vorlage.

37. Passen Sie Privilegien und Berechtigungen an.

38. Speichern Sie die Rolle und weisen Sie sie Benutzern zu.

### 3.7.4 Berechtigungsübersicht (Authorization Overview)

**Was:** Ein Benutzer mit Administratorrolle sieht hier alle Benutzer,
Rollen und Spaces des Mandanten und wie sie zusammenhängen.

**Optionen:** Sie können nach Benutzer, Rolle oder Space filtern und
sehen dann zum Beispiel, welche Benutzer welchen globalen Rollen
zugewiesen sind. Der Umfang der weiteren Auswertungen, etwa der
Zuordnungen über bereichsbezogene Rollen, ist **nicht vollständig
verifiziert**.

**Wofür:** Sie prüfen Berechtigungen, ohne jede Rolle einzeln öffnen zu
müssen, etwa für Audits oder Rezertifizierungen.

### 3.7.5 Aktivitäten (Activities)

**Was:** Hier verfolgen Sie, welche Aktivitäten Benutzer an Objekten wie
Spaces, Tabellen, Sichten und Datenflüssen ausführen. Auch Änderungen an
Benutzern und Rollen werden nachvollziehbar.

**Optionen laut SAP-Hinweis 3543334 (KBA):**

-   Protokolleinträge ganz oder teilweise als CSV-Datei herunterladen
    und anschließend im System löschen.

-   Die Obergrenze an Zeilen kann auf Anfrage erhöht oder auf einen
    rollierenden Zeitraum von einem Jahr umgestellt werden.

**Hinweis:** Ist das Protokoll fast voll, sollten Sie es rechtzeitig
exportieren und bereinigen.

## 3.8 Übersicht: Funktion -- Zweck -- benötigtes Privileg

  ---------------------------------------------------------------------------
  **Funktion**              **Zweck**                **Benötigte
                                                     Rolle/Privileg**
  ------------------------- ------------------------ ------------------------
  Mandantenkonfiguration    Größe in CU festlegen    Administratorrolle (*DW
                            (Speicher,               Administrator*);
                            Rechenleistung,          Einzelprivileg nicht
                            Zusatzoptionen)          verifiziert

  Arbeitslastverwaltung     Prioritäten und          Administratorrolle;
                            Anweisungslimits je      nicht verifiziert
                            Space oder Gruppe        

  Audit → Löschen von       Prüfprotokolle je Space  Administratorrolle
  Prüfprotokollen           und Richtlinie löschen   

  Aufgabenprotokolle        Speicherbelegung prüfen, Administratorrolle
                            alte Protokolle löschen  

  Sicherheit                Kennwortrichtlinie für   Administratorrolle
  (Konfiguration)           Datenbankbenutzer        

  IP-Zulassungsliste        Zugelassene              Administratorrolle
                            IPv4-Bereiche für den    
                            Datenbankzugriff         

  Mandantenverknüpfungen    Verknüpfung mit SAP      Administratorrolle
                            Analytics Cloud /        
                            Produktumschalter        

  Systeminformationen       Informationsleiste,      Administratorrolle
                            Browser-Symbol           

  Eigener                   SSO über eigenen         Systemverantwortlicher
  SAML-Identitätsanbieter   Identitätsanbieter       (*System Owner*)

  Systemverantwortung       Rolle an geeignete       Systemverantwortlicher
  übertragen                Person übergeben         

  Benutzer                  Benutzer anlegen,        Administratorrolle
                            ändern, Rollen zuweisen  

  SCIM 2.0                  Automatische             OAuth-Client
                            Benutzerbereitstellung   (Client-Anmeldedaten)

  Rollen                    Standard-,               Administratorrolle
                            benutzerdefinierte und   
                            bereichsbezogene Rollen  

  Berechtigungsübersicht    Benutzer, Rollen und     Administratorrolle
                            Spaces auswerten         

  Aktivitäten               Aktivitäten              Administratorrolle
                            nachverfolgen,           
                            exportieren, löschen     
  ---------------------------------------------------------------------------

Die genauen Privilegienbezeichnungen der Rollenpflege, etwa „User
(Manage)" oder „Role (Manage)", sind **nicht verifiziert** und werden
nach der Quellenprüfung ergänzt.

## 3.9 Abhängigkeiten, Grenzen, Hinweise und Monitoring-Einstieg

-   **Bereitstellungsweg:** Mandanten aus SAP Business Data Cloud werden
    anders bereitgestellt als Mandanten über SAP BTP. Die Größe stellen
    Sie in beiden Fällen in SAP Datasphere ein. ⚠ abhängig von
    Lizenz/Freischaltung.

-   **Speicherfreigabe:** Laut SAP-Hinweis 3578156 gibt das Löschen von
    Prüfprotokollen den Plattenspeicher nicht sofort frei. Die
    Speicherbereinigung wird automatisch gestartet, kann bei großen
    Löschmengen aber dauern.

-   **SCIM:** Nur für Benutzer, nicht für die Pflege von Rollen (siehe
    3.7.2).

-   **Plattformabhängige Oberfläche:** Teile der Administration folgen
    der Plattformversion und können deshalb von der Datasphere-Version
    abweichen (siehe 3.3.10). Registerkarten und Beschriftungen ändern
    sich quartalsweise.

-   **Monitoring:** Die Überwachung von Systemleistung, Speicher,
    Aufgaben und Out-of-Memory-Situationen erfolgt in den
    Monitoring-Werkzeugen, die Sie ebenfalls über die Seitenleiste
    erreichen. Siehe Kapitel 10.
