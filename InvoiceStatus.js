<div id="divStatus" style="display: none;">
    <script>        document.addEventListener('DOMContentLoaded', () => {
            const labelText = 'eInvoice Status';
			const vModelForm = document.getElementById('v-model-form');
			if (vModelForm) {
				const labels = vModelForm.querySelectorAll('label');
				labels.forEach(label => {
					if (label.textContent.trim() === labelText) {
						const formGroup = label.closest('.form-group');
						if (formGroup) {
							const inputs = formGroup.querySelectorAll('input');
							const updateButton = document.querySelector('button.btn.btn-success[onclick="ajaxPost(true)"]');
							if (updateButton) 
							{
								inputs.forEach(input => {input.readOnly = true;});
							}
							else{
								app.CustomFields2.Strings[eInvoiceStatusFieldGuid]= '-';
								inputs.forEach(input => {input.value = '-';});
							}
						}
					}
				});
			}
			const selfDeletingContainer = document.getElementById('divStatus');
			if (selfDeletingContainer) {
				selfDeletingContainer.remove();
			}
		});
    </script>
</div>