```mermaid
```mermaid
classDiagram
%% Webconferencing Architecture Diagram (validated and corrected)
%% Every module and class is labeled with a specific code. Fields include data types.
%% Arrows: --> media/data flow, -.-> control/signaling flow, ..> containment mapping.
%% Colors explained in LEGEND1_Legend below.

%% -----------------------
%% MP1.1 Meeting Page (Model-View-Controller)
%% -----------------------
package "MP1.1 Meeting Page (Model-View-Controller)" {
  class MP1_1_MeetingPageModule {
    +code: string
    +description: string
  }

  class MP1_1_MeetingModel {
    +meetingIdentifier: string
    +participants: List<MP1_1_ParticipantModel>
    +localParticipant: MP1_1_ParticipantModel
    +simulcastTierInformation: List<ENC1_1_SimulcastTier>
    +audioConfirmationStatusByParticipant: Map<string,AUD1_3_AudioConfirmationStatus>
  }

  class MP1_1_MeetingView {
    +domRootElement: DocumentObjectModelElement
    +networkStatusIconComponent: ICON1_1_NetworkIconComponent
    +speakerStatusIconComponent: ICON1_2_SpeakerIconComponent
    +render()
    +updateParticipantAudioIcon()
    +showNetworkAcknowledgement()
  }

  class MP1_1_MeetingController {
    +signalingClient: SRV1_4_SignalingServer
    +sfuClientAdapter: SRV1_4_SFUServer
    +audioCaptureService: AUD1_1_AudioCaptureService
    +initialize()
    +handleIncomingRealTimeTransportProtocolPackets()
    +sendRealTimeTransportControlProtocolReceiverReports()
    +handleQualityTierChangeRequest()
  }

  class MP1_1_ParticipantModel {
    +participantIdentifier: string
    +displayName: string
    +isMutedByUser: boolean
    +currentAudioConfirmationStatus: AUD1_3_AudioConfirmationStatus
  }
}

MP1_1_MeetingPageModule ..> MP1_1_MeetingModel : contains
MP1_1_MeetingPageModule ..> MP1_1_MeetingView : contains
MP1_1_MeetingPageModule ..> MP1_1_MeetingController : contains
MP1_1_MeetingPageModule ..> MP1_1_ParticipantModel : contains

%% -----------------------
%% SP1.2 Settings Page (Model-View-Controller)
%% -----------------------
package "SP1.2 Settings Page (Model-View-Controller)" {
  class SP1_2_SettingsPageModule {
    +code: string
    +description: string
  }

  class SP1_2_SettingsModel {
    +preferredAudioCodec: string
    +preferredSimulcastTiers: List<ENC1_1_SimulcastTier>
    +preferredCaptureChannels: int
  }

  class SP1_2_SettingsView {
    +domRootElement: DocumentObjectModelElement
    +render()
    +applySettings()
  }

  class SP1_2_SettingsController {
    +settingsModel: SP1_2_SettingsModel
    +saveSettings()
    +loadSettings()
  }
}

SP1_2_SettingsPageModule ..> SP1_2_SettingsModel : contains
SP1_2_SettingsPageModule ..> SP1_2_SettingsView : contains
SP1_2_SettingsPageModule ..> SP1_2_SettingsController : contains

%% -----------------------
%% AM1.3 Admin Monitoring Page (Model-View-Controller)
%% -----------------------
package "AM1.3 Admin Monitoring Page (Model-View-Controller)" {
  class AM1_3_AdminPageModule {
    +code: string
    +description: string
  }

  class AM1_3_AdminModel {
    +activeMeetings: List<string>
    +serverMetrics: Map<string,SRV1_4_SFUServerMetrics>
    +recentQualityDecisions: List<QSL1_1_QualityDecisionRecord>
  }

  class AM1_3_AdminView {
    +domRootElement: DocumentObjectModelElement
    +renderServerHealthDashboard()
    +renderQualityMetrics()
  }

  class AM1_3_AdminController {
    +adminModel: AM1_3_AdminModel
    +queryServerMetrics()
    +subscribeToServerEvents()
  }
}

AM1_3_AdminPageModule ..> AM1_3_AdminModel : contains
AM1_3_AdminPageModule ..> AM1_3_AdminView : contains
AM1_3_AdminPageModule ..> AM1_3_AdminController : contains

%% -----------------------
%% SRV1.4 Server Components (SFU, Signaling, STUN/TURN)
%% -----------------------
package "SRV1.4 Server Components" {
  class SRV1_4_SFUServer {
    +serverIdentifier: string
    +clientSessionMap: Map<string,SRV1_4_ClientSession>
    +qualitySelectionEngine: QSL1_1_QualitySelectionEngine
    +realTimeTransportControlProtocolHandler: RTCP1_1_RealTimeTransportControlProtocolHandler
    +simulcastRouter: ENC1_3_SimulcastRouter
    +receiveRealTimeTransportProtocol()
    +forwardRealTimeTransportProtocolToRecipient()
    +evaluateQualityForRecipient()
    +sendRealTimeTransportControlProtocolAcknowledgement()
  }

  class SRV1_4_ClientSession {
    +sessionIdentifier: string
    +associatedParticipantIdentifier: string
    +iceConnectivityState: string
    +lastReceivedMetricsTimestamp: Timestamp
  }

  class SRV1_4_SignalingServer {
    +serverIdentifier: string
    +webSocketEndpointUrl: string
    +sessionRegistry: Map<string,string>
    +negotiateSessionDescriptionProtocol()
    +exchangeInteractiveConnectivityEstablishmentCandidates()
    +sendControlPlaneMessages()
  }

  class SRV1_4_StunTurnService {
    +serviceIdentifier: string
    +stunServerList: List<string>
    +turnServerList: List<string>
    +allocateRelayForClient()
    +respondToBindingRequest()
  }

  class SRV1_4_SFUServerMetrics {
    +currentCpuUtilizationPercent: float
    +currentMemoryUsageMegabytes: int
    +activeSessionCount: int
  }
}

SRV1_4_SFUServer --> SRV1_4_ClientSession : manages
SRV1_4_SFUServer --> QSL1_1_QualitySelectionEngine : uses
SRV1_4_SFUServer --> RTCP1_1_RealTimeTransportControlProtocolHandler : routes RTCP
SRV1_4_SignalingServer --> SRV1_4_SFUServer : coordination and control
SRV1_4_StunTurnService --> SRV1_4_SignalingServer : assists with NAT traversal

%% -----------------------
%% NET1.5 Network and Media Stack Components
%% -----------------------
package "NET1.5 Network and Media Stack Components" {
  class NET1_5_WebRealTimeCommunicationNetworkStack {
    +interactiveConnectivityEstablishmentAgent: NET1_5_InteractiveConnectivityEstablishmentAgent
    +datagramTransportLayerSecuritySession: NET1_5_DatagramTransportLayerSecuritySession
    +secureRealTimeTransportProtocolContext: NET1_5_SecureRealTimeTransportProtocolContext
    +establishNetworkConnection()
    +performDatagramTransportLayerSecurityHandshake()
  }

  class NET1_5_InteractiveConnectivityEstablishmentAgent {
    +candidateList: List<string>
    +gatherCandidates()
    +selectBestCandidatePair()
  }

  class NET1_5_DatagramTransportLayerSecuritySession {
    +sessionState: string
    +exchangeKeys()
  }

  class NET1_5_SecureRealTimeTransportProtocolContext {
    +cryptoContextIdentifier: string
    +protectRtpPacket()
    +unprotectRtpPacket()
  }
}

NET1_5_WebRealTimeCommunicationNetworkStack --> NET1_5_InteractiveConnectivityEstablishmentAgent : coordinates
NET1_5_WebRealTimeCommunicationNetworkStack --> NET1_5_DatagramTransportLayerSecuritySession : secures
NET1_5_WebRealTimeCommunicationNetworkStack --> NET1_5_SecureRealTimeTransportProtocolContext : encrypts media

%% -----------------------
%% ENC1.* Encoding and Simulcast Components
%% -----------------------
package "ENC1.1 Encoding and Simulcast Components" {
  class ENC1_1_SimulcastEncoder {
    +encoderIdentifier: string
    +simulcastTiers: List<ENC1_1_SimulcastTier>
    +encodeAudioFrame()
    +generateSimulcastStreams()
  }

  class ENC1_1_SimulcastTier {
    +tierName: string
    +targetKilobitsPerSecond: int
    +channelCount: int
    +codecName: string
  }

  class ENC1_3_SimulcastRouter {
    +routeTableByRecipient: Map<string,ENC1_1_SimulcastTier>
    +selectTierForRecipient()
    +switchOutboundStreamForRecipient()
  }
}

ENC1_1_SimulcastEncoder --> ENC1_1_SimulcastTier : contains
SRV1_4_SFUServer --> ENC1_3_SimulcastRouter : delegates stream routing

%% -----------------------
%% QSL1.1 Quality Selection Engine and Metrics
%% -----------------------
package "QSL1.1 Quality Selection Engine and Metrics" {
  class QSL1_1_QualitySelectionEngine {
    +hysteresisWindowSeconds: int
    +perReceiverMetrics: Map<string,QSL1_2_ReceiverMetrics>
    +evaluateAndSelectQualityTierForRecipient()
    +updateMetricsForReceiver()
  }

  class QSL1_2_ReceiverMetrics {
    +packetLossRatePercent: float
    +jitterMilliseconds: int
    +bufferUnderrunEventCount: int
    +lastMetricTimestamp: Timestamp
  }

  class QSL1_1_QualityDecisionRecord {
    +recipientIdentifier: string
    +selectedTierName: string
    +decisionTimestamp: Timestamp
    +reasonSummary: string
  }
}

SRV1_4_SFUServer --> QSL1_1_QualitySelectionEngine : "invokes evaluation every 2 to 3 seconds"

%% -----------------------
%% RTCP1.1 RTCP Handler and Fingerprint / Confirmation
%% -----------------------
package "RTCP1.1 Real-time Transport Control Protocol Handling and Fingerprint Confirmation" {
  class RTCP1_1_RealTimeTransportControlProtocolHandler {
    +incomingBufferQueue: Queue
    +lastSenderReportsByStream: Map<string,Timestamp>
    +processReceiverReport()
    +processExtendedReport()
    +sendSenderReport()
    +sendAcknowledgementToSender()
  }

  class FGP1_1_AudioFingerprintService {
    +computeIntervalSeconds: int
    +computeCyclicRedundancyCheck32OfLastDecodedAudioFrameBuffer()
    +sendFingerprintViaRealTimeTransportControlProtocolExtendedReport()
  }

  class RTCP1_1_RtcpExtendedReportPayload {
    +senderIdentifier: string
    +cyclicRedundancyCheck32HexString: string
    +timestampUtc: Timestamp
  }
}

SRV1_4_SFUServer --> RTCP1_1_RealTimeTransportControlProtocolHandler : routes RTCP feedback
MP1_1_MeetingController --> FGP1_1_AudioFingerprintService : triggers computation every 10 seconds

%% -----------------------
%% AUD1.1 Client-Side Audio Capture and Local Services
%% -----------------------
package "AUD1.1 Client-Side Audio Capture and Local Services" {
  class AUD1_1_AudioCaptureService {
    +captureDeviceIdentifier: string
    +capturedMediaStream: AUD1_2_MediaStreamRepresentation
    +simulcastEncoder: ENC1_1_SimulcastEncoder
    +captureFrame()
    +pushFrameToEncoder()
  }

  class AUD1_2_MediaStreamRepresentation {
    +streamIdentifier: string
    +trackCount: int
  }

  class AUD1_3_AudioConfirmationStatus {
    +statusName: string
    +lastUpdatedTimestamp: Timestamp
  }
}

MP1_1_MeetingController --> AUD1_1_AudioCaptureService : controls capture and upstream streaming
AUD1_1_AudioCaptureService --> ENC1_1_SimulcastEncoder : sends raw frames to encoder

%% -----------------------
%% ICON1.* User Interface Icon Components
%% -----------------------
package "ICON1.* User Interface Icon Components" {
  class ICON1_1_NetworkIconComponent {
    +iconElement: DocumentObjectModelElement
    +statusColor: string
    +render()
    +updateColor()
  }

  class ICON1_2_SpeakerIconComponent {
    +iconElement: DocumentObjectModelElement
    +statusColor: string
    +render()
    +updateColor()
  }
}

MP1_1_MeetingView --> ICON1_1_NetworkIconComponent : renders network acknowledgment status
MP1_1_MeetingView --> ICON1_2_SpeakerIconComponent : renders audio fingerprint status

%% -----------------------
%% Client <-> Server relationships and protocol labels
%% -----------------------
MP1_1_MeetingController -.-> SRV1_4_SignalingServer : "Control plane: Session Description Protocol and Interactive Connectivity Establishment candidate exchange"
AUD1_1_AudioCaptureService -->|RealTimeTransportProtocol over SecureRealTimeTransportProtocol| SRV1_4_SFUServer : "Upstream media: three simulcast streams (low/medium/high)"
SRV1_4_SFUServer -->|RealTimeTransportProtocol over SecureRealTimeTransportProtocol| MP1_1_MeetingController : "Downstream selected tier per recipient"
MP1_1_MeetingController -->|RealTimeTransportControlProtocol Receiver Reports| SRV1_4_SFUServer : "Receiver reports with packet loss and jitter metrics"
MP1_1_MeetingController -->|RealTimeTransportControlProtocol Extended Reports| SRV1_4_SFUServer : "Audio fingerprint CRC32 hashes"
SRV1_4_SFUServer -.-> MP1_1_MeetingController : "RTCP acknowledgements and Sender Reports (timing sync)"
SRV1_4_SignalingServer -.-> SRV1_4_SFUServer : "Control plane quality tier change and REMB bitrate adjustments"

%% -----------------------
%% Administrative and Monitoring flows
%% -----------------------
AM1_3_AdminController -.-> SRV1_4_SFUServer : subscribe to server metrics and quality decision events

%% -----------------------
%% LEGEND and Styling
%% -----------------------
package "LEGEND1 Diagram Legend and Key" {
  class LEGEND1_Legend {
    +SolidArrow: string = "Solid arrow (-->): media or primary data flow (for example, RTP)."
    +DashedArrow: string = "Dashed arrow (-.->): control or signaling plane messages (for example, SDP or REMB)."
    +DottedArrow: string = "Dotted arrow (..>): containment mapping between module and classes."
    +ClientComponentColor: string = "Light blue: Client-side pages and components."
    +ServerComponentColor: string = "Light green: Server-side components."
    +NetworkComponentColor: string = "Light yellow: Network and encryption components."
    +EncodingComponentColor: string = "Light orange: Encoding and simulcast components."
  }
}

classDef clientComp fill:#e3f2fd,stroke:#1e88e5
classDef serverComp fill:#e8f5e9,stroke:#2e7d32
classDef networkComp fill:#fff8e1,stroke:#f9a825
classDef encodingComp fill:#fff3e0,stroke:#ef6c00
classDef uiComp fill:#f3e5f5,stroke:#6a1b9a
classDef legendComp fill:#eeeeee,stroke:#616161

class MP1_1_MeetingModel,MP1_1_MeetingView,MP1_1_MeetingController,MP1_1_ParticipantModel clientComp
class SP1_2_SettingsModel,SP1_2_SettingsView,SP1_2_SettingsController clientComp
class AM1_3_AdminModel,AM1_3_AdminView,AM1_3_AdminController clientComp
class ICON1_1_NetworkIconComponent,ICON1_2_SpeakerIconComponent uiComp

class SRV1_4_SFUServer,SRV1_4_ClientSession,SRV1_4_SignalingServer,SRV1_4_StunTurnService serverComp
class SRV1_4_SFUServerMetrics serverComp

class NET1_5_WebRealTimeCommunicationNetworkStack,NET1_5_InteractiveConnectivityEstablishmentAgent,NET1_5_DatagramTransportLayerSecuritySession,NET1_5_SecureRealTimeTransportProtocolContext networkComp

class ENC1_1_SimulcastEncoder,ENC1_1_SimulcastTier,ENC1_3_SimulcastRouter encodingComp

class QSL1_1_QualitySelectionEngine,QSL1_2_ReceiverMetrics,QSL1_1_QualityDecisionRecord encodingComp

class RTCP1_1_RealTimeTransportControlProtocolHandler,FGP1_1_AudioFingerprintService,RTCP1_1_RtcpExtendedReportPayload networkComp

class AUD1_1_AudioCaptureService,AUD1_2_MediaStreamRepresentation,AUD1_3_AudioConfirmationStatus clientComp

class LEGEND1_Legend legendComp
```
```
