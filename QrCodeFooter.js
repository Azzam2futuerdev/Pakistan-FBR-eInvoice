<script>
    document.addEventListener('DOMContentLoaded', () => {
		var qrCodeContent = '%%eInvoice Status%%';
		
		if (qrCodeContent != 'N/A')
		{
    		var mainTable = document.querySelector('#printable-content > table');
    		if (mainTable) {
    			var newRow = mainTable.insertRow();
    			var newCell = newRow.insertCell();
    			newCell.colSpan = 99;
    			newCell.innerHTML += '<div id="signedQrCode" style="padding: 20px"></div>';
    		}
    
    		new QRCode(document.getElementById("signedQrCode"), {
    			text: qrCodeContent,
    			width: 160,
    			height: 160,
    			colorDark: "#000000",
    			colorLight: "#fafafa",
    			correctLevel: QRCode.CorrectLevel.L
    		});
    
    		var qrcodeDiv = document.getElementById('qrcode');
    		if (qrcodeDiv) {
    			qrcodeDiv.remove();
    		}
		}
	});
</script>