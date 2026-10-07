"""
PulseQC Official Google Play Android Publisher API Client.
Interfaces with https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/reviews
Implements strict credential diagnosis, pagination, quota handling, and error differentiation.
"""

import json
import os
import urllib.request
import urllib.error
import time
from typing import Dict, Any, List, Optional, Tuple
from pulseqc.config import Config


class GooglePlayStatus:
    NOT_CONFIGURED = "NOT_CONFIGURED"
    INVALID = "INVALID"
    UNAUTHORIZED = "UNAUTHORIZED"
    CONNECTED = "CONNECTED"
    ERROR = "ERROR"


class GooglePlayClient:
    def __init__(self, package_name: str = Config.APP_PACKAGE_NAME):
        self.package_name = package_name
        self.credentials_path = Config.GOOGLE_APPLICATION_CREDENTIALS
        self.api_base = f"{Config.PLAY_API_BASE_URL}/{self.package_name}/reviews"
        self._access_token: Optional[str] = None
        self._token_expiry: float = 0.0

    def diagnose_connection(self) -> Dict[str, Any]:
        """
        In-application diagnostic wizard checking:
        1. Credential availability
        2. Credential validity
        3. Google Cloud project configuration
        4. Google Play API availability
        5. Play Console authorization
        6. Package-name access
        """
        diagnostics = {
            "credentials": {"status": "FAIL", "explanation": "", "action": ""},
            "google_api": {"status": "FAIL", "explanation": "", "action": ""},
            "play_console": {"status": "FAIL", "explanation": "", "action": ""},
            "package_access": {"status": "FAIL", "explanation": "", "action": ""},
            "review_endpoint": {"status": "FAIL", "explanation": "", "action": ""},
            "overall_state": GooglePlayStatus.NOT_CONFIGURED
        }

        # 1. Credential Check
        if not self.credentials_path:
            diagnostics["credentials"]["status"] = "FAIL"
            diagnostics["credentials"]["explanation"] = "GOOGLE_APPLICATION_CREDENTIALS path is not configured."
            diagnostics["credentials"]["action"] = "Set GOOGLE_APPLICATION_CREDENTIALS in .env to a service account JSON file."
            diagnostics["overall_state"] = GooglePlayStatus.NOT_CONFIGURED
            return diagnostics

        if not os.path.exists(self.credentials_path):
            diagnostics["credentials"]["status"] = "FAIL"
            diagnostics["credentials"]["explanation"] = f"Credential file does not exist at {self.credentials_path}."
            diagnostics["credentials"]["action"] = "Verify file path and permissions."
            diagnostics["overall_state"] = GooglePlayStatus.INVALID
            return diagnostics

        try:
            with open(self.credentials_path, "r", encoding="utf-8") as f:
                cred_data = json.load(f)
            if cred_data.get("type") != "service_account" or not cred_data.get("client_email"):
                diagnostics["credentials"]["status"] = "FAIL"
                diagnostics["credentials"]["explanation"] = "File is not a valid Google Cloud Service Account JSON."
                diagnostics["credentials"]["action"] = "Export a fresh Service Account key from Google Cloud Console."
                diagnostics["overall_state"] = GooglePlayStatus.INVALID
                return diagnostics
            diagnostics["credentials"]["status"] = "PASS"
            diagnostics["credentials"]["explanation"] = f"Valid service account: {cred_data.get('client_email')}"
            diagnostics["credentials"]["action"] = "None required."
        except Exception as e:
            diagnostics["credentials"]["status"] = "FAIL"
            diagnostics["credentials"]["explanation"] = f"Failed to parse credentials: {str(e)}"
            diagnostics["credentials"]["action"] = "Ensure JSON file is well-formed."
            diagnostics["overall_state"] = GooglePlayStatus.INVALID
            return diagnostics

        # 2. Token & Google API check
        token, token_err = self._obtain_access_token(cred_data)
        if not token:
            diagnostics["google_api"]["status"] = "FAIL"
            diagnostics["google_api"]["explanation"] = f"OAuth2 token exchange failed: {token_err}"
            diagnostics["google_api"]["action"] = "Ensure Google Cloud project has Android Publisher API enabled and time is synchronized."
            diagnostics["overall_state"] = GooglePlayStatus.ERROR
            return diagnostics
        
        diagnostics["google_api"]["status"] = "PASS"
        diagnostics["google_api"]["explanation"] = "OAuth2 access token successfully minted."
        diagnostics["google_api"]["action"] = "None."

        # 3. Test reviews.list endpoint
        test_url = f"{self.api_base}?maxResults=1"
        try:
            req = urllib.request.Request(
                test_url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                    "User-Agent": "PulseQC-Worker/1.0"
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                diagnostics["play_console"]["status"] = "PASS"
                diagnostics["play_console"]["explanation"] = "Play Console linked to Google Cloud project."
                diagnostics["package_access"]["status"] = "PASS"
                diagnostics["package_access"]["explanation"] = f"Authorized for package: {self.package_name}"
                diagnostics["review_endpoint"]["status"] = "PASS"
                diagnostics["review_endpoint"]["explanation"] = "reviews.list endpoint accessible."
                diagnostics["overall_state"] = GooglePlayStatus.CONNECTED
                return diagnostics
        except urllib.error.HTTPError as he:
            if he.code in (401, 403):
                diagnostics["play_console"]["status"] = "FAIL"
                diagnostics["play_console"]["explanation"] = f"HTTP {he.code}: Service account not invited or unauthorized in Play Console."
                diagnostics["play_console"]["action"] = "Add service account to Google Play Console Users & Permissions with 'View app information and download bulk reports' rights."
                diagnostics["package_access"]["status"] = "FAIL"
                diagnostics["package_access"]["explanation"] = f"Access denied to package '{self.package_name}'."
                diagnostics["package_access"]["action"] = "Grant app-level permission in Play Console."
                diagnostics["overall_state"] = GooglePlayStatus.UNAUTHORIZED
            else:
                diagnostics["review_endpoint"]["status"] = "FAIL"
                diagnostics["review_endpoint"]["explanation"] = f"HTTP {he.code}: {he.reason}"
                diagnostics["review_endpoint"]["action"] = "Check API quota and network reachability."
                diagnostics["overall_state"] = GooglePlayStatus.ERROR
            return diagnostics
        except Exception as ex:
            diagnostics["review_endpoint"]["status"] = "FAIL"
            diagnostics["review_endpoint"]["explanation"] = f"Network exception: {str(ex)}"
            diagnostics["review_endpoint"]["action"] = "Check outbound internet connectivity."
            diagnostics["overall_state"] = GooglePlayStatus.ERROR
            return diagnostics

    def fetch_reviews(
        self,
        max_results: int = 50,
        token_page: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str]]:
        """
        Fetch reviews using official Android Publisher reviews.list operation.
        Returns (reviews_list, next_token, error_message).
        """
        diag = self.diagnose_connection()
        if diag["overall_state"] != GooglePlayStatus.CONNECTED:
            return [], None, f"Google Play API is not connected. State: {diag['overall_state']}"

        # Real fetch implementation with pagination token
        # Token is obtained during diagnosis
        token, _ = self._get_cached_or_new_token()
        url = f"{self.api_base}?maxResults={max_results}"
        if token_page:
            url += f"&token={token_page}"

        try:
            req = urllib.request.Request(
                url,
                headers={"Authorization": f"Bearer {token}", "User-Agent": "PulseQC-Worker/1.0"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                raw_reviews = data.get("reviews", [])
                token_pagination = data.get("tokenPagination", {}).get("nextPageToken")
                return raw_reviews, token_pagination, None
        except Exception as e:
            return [], None, str(e)

    def _obtain_access_token(self, cred_data: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """Mint OAuth2 access token for Android Publisher scope."""
        # Simulated token exchanger / real JWT handler placeholder
        # Note: Production environment uses google-auth library
        try:
            # Check if external google.oauth2 is importable
            from google.oauth2 import service_account
            import google.auth.transport.requests

            credentials = service_account.Credentials.from_service_account_info(
                cred_data,
                scopes=["https://www.googleapis.com/auth/androidpublisher"]
            )
            request = google.auth.transport.requests.Request()
            credentials.refresh(request)
            return credentials.token, None
        except ImportError:
            # Fallback when google-auth is not installed in standard library
            return None, "google-auth package not available in standard Python environment."
        except Exception as ex:
            return None, str(ex)

    def _get_cached_or_new_token(self) -> Tuple[Optional[str], Optional[str]]:
        if self._access_token and time.time() < self._token_expiry:
            return self._access_token, None
        # Load and mint
        if not os.path.exists(self.credentials_path):
            return None, "Credentials file not found"
        with open(self.credentials_path, "r", encoding="utf-8") as f:
            cred_data = json.load(f)
        token, err = self._obtain_access_token(cred_data)
        if token:
            self._access_token = token
            self._token_expiry = time.time() + 3500
        return token, err
